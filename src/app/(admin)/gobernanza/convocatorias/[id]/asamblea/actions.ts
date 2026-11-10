"use server";
import { assertPermission } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";
import { getCurrentSession } from "@/app/actions/auth";
import { prisma } from "@/shared/infrastructure/db/prisma";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { appOrigin } from "@/shared/infrastructure/app-origin";
import { absoluteFileUrl } from "@/shared/infrastructure/storage/storage-paths";
import {
  buildAnnouncementInvitationEmailHtml,
  AnnouncementDateEmailItem,
} from "@/shared/infrastructure/email/announcement-email-template";
import {
  serializeTopicConclusions,
  TopicConclusionsData
} from "@/app/(admin)/gobernanza/convocatorias/_lib/governance-terms";

function getEffectiveSenderEmail(condominiumName?: string | null): string {
  const customSender = process.env.ADMIN_MAIL_FROM?.trim();
  if (customSender && customSender.length > 0) {
    return customSender;
  }

  const name =
    condominiumName && condominiumName.trim().length > 0
      ? condominiumName.trim()
      : "Val'Quirico";

  return `Condominio ${name} <finanzas@info.valquirico.com>`;
}

async function isCallerMasterUser(userId: string): Promise<boolean> {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  return userRoles.some(
    (ur) => ur.role?.name?.trim().toLowerCase() === "master"
  );
}

/**
 * Toggle attendance for a given position or guest ID in the specific date called session.
 * Stores a comma-separated list of present IDs.
 */
export async function toggleAttendanceAction(dateId: string, positionId: string, isPresent: boolean) {
  try {
    await assertPermission([MODULES.CONVOCATORIAS, MODULES.CONVOCATORIAS_CONDOMINO], "canRead");
    const session = await getCurrentSession();
    if (!session) throw new Error("No hay una sesión activa");

    const callDate = await prisma.announcementDate.findUnique({
      where: { id: dateId },
      include: {
        announcement: {
          include: { status: true }
        }
      }
    });

    if (!callDate) throw new Error("Fecha de convocatoria no encontrada");

    // Validar que la convocatoria se encuentre en proceso
    const isStarted =
      callDate.status === "En Proceso" ||
      callDate.status === "Iniciada" ||
      callDate.announcement?.status?.name === "En Proceso" ||
      callDate.announcement?.status?.name === "Iniciada";

    if (!isStarted) {
      throw new Error("No se puede registrar asistencia en una convocatoria que no ha sido iniciada.");
    }

    let current = callDate.checkedPositions
      ? callDate.checkedPositions.split(",").map(id => id.trim()).filter(Boolean)
      : [];

    if (isPresent) {
      if (!current.includes(positionId)) {
        current.push(positionId);
      }
    } else {
      current = current.filter(id => id !== positionId);
    }

    const updated = await prisma.announcementDate.update({
      where: { id: dateId },
      data: {
        checkedPositions: current.join(",")
      }
    });

    revalidatePath(`/gobernanza/convocatorias/${callDate.announcementId}`, "layout");
    revalidatePath(`/gobernanza/convocatorias/${callDate.announcementId}/asamblea/${dateId}`);
    revalidatePath(`/gobernanza/convocatorias/${callDate.announcementId}/asamblea/${dateId}/participar`);
    return { success: true, checkedPositions: updated.checkedPositions };
  } catch (error: any) {
    console.error("Error toggling attendance:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Cast or update a vote on a specific agenda topic for a given position or guest.
 * Stores the vote mappings as a serialized JSON string in the database.
 */
export async function registerVoteAction(topicId: string, positionId: string, voteType: string) {
  try {
    await assertPermission([MODULES.CONVOCATORIAS, MODULES.CONVOCATORIAS_CONDOMINO], "canRead");
    const session = await getCurrentSession();
    if (!session) throw new Error("No hay una sesión activa");

    const topic = await prisma.announcementTopic.findUnique({
      where: { id: topicId },
      include: {
        announcement: {
          include: { status: true, dates: true }
        }
      }
    });

    if (!topic) throw new Error("Tema de orden del día no encontrado");

    // Validar que la sesión esté en curso
    const announcementStatus = topic.announcement?.status?.name;
    const isStarted =
      announcementStatus === "En Proceso" ||
      announcementStatus === "Iniciada" ||
      topic.announcement?.dates.some(d => d.status === "En Proceso" || d.status === "Iniciada");

    if (!isStarted) {
      throw new Error("No se puede votar en una convocatoria que no ha iniciado o que ya ha concluido.");
    }

    let currentVotes: Record<string, string> = {};
    if (topic.votesJson) {
      try {
        currentVotes = JSON.parse(topic.votesJson);
      } catch (err) {
        currentVotes = {};
      }
    }

    if (voteType === "NONE") {
      delete currentVotes[positionId];
    } else {
      currentVotes[positionId] = voteType; // FAVOR, AGAINST, ABSTAIN
    }

    const updated = await prisma.announcementTopic.update({
      where: { id: topicId },
      data: {
        votesJson: JSON.stringify(currentVotes)
      }
    });

    revalidatePath(`/gobernanza/convocatorias/${updated.announcementId}`, "layout");
    return { success: true, votesJson: updated.votesJson };
  } catch (error: any) {
    console.error("Error registering vote:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Save topic conclusions, formal agreement, attachments, and responsible person.
 * Accepts either a raw string or structured TopicConclusionsData.
 */
export async function saveTopicConclusionsAction(
  topicId: string,
  payload: string | Partial<TopicConclusionsData>
) {
  try {
    await assertPermission(MODULES.CONVOCATORIAS, "canUpdate");
    const session = await getCurrentSession();
    if (session?.userId && await isCallerMasterUser(session.userId)) {
      return { success: false, error: "El usuario con rol Master no puede modificar temas de convocatoria." };
    }

    const rawConclusions =
      typeof payload === "string" ? payload : serializeTopicConclusions(payload);

    const updated = await prisma.announcementTopic.update({
      where: { id: topicId },
      data: { conclusions: rawConclusions }
    });

    revalidatePath(`/gobernanza/convocatorias/${updated.announcementId}`, "layout");
    return { success: true };
  } catch (error: any) {
    console.error("Error saving topic conclusions:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Close/complete the assembly session and update its status.
 */
export async function closeAsambleaAction(dateId: string, isCompleted: boolean) {
  try {
    await assertPermission(MODULES.CONVOCATORIAS, "canUpdate");
    const session = await getCurrentSession();
    if (session?.userId && await isCallerMasterUser(session.userId)) {
      return { success: false, error: "El usuario con rol Master no tiene autorización para cerrar convocatorias." };
    }

    const status = isCompleted ? "Realizada" : "No Realizada";
    
    await prisma.announcementDate.update({
      where: { id: dateId },
      data: { status }
    });

    // Also update overall parent Announcement status to "Terminada" / "Cancelada"
    const callDate = await prisma.announcementDate.findUnique({
      where: { id: dateId },
      include: { announcement: true }
    });

    if (callDate) {
      const closedStatus = await prisma.announcementStatus.findFirst({
        where: { name: { contains: isCompleted ? "Terminada" : "Cancelada", mode: "insensitive" } }
      });
      
      if (closedStatus) {
        await prisma.announcement.update({
          where: { id: callDate.announcementId },
          data: { statusId: closedStatus.id }
        });
      }
      
      revalidatePath(`/gobernanza/convocatorias/${callDate.announcementId}`, "layout");
    }

    revalidatePath("/gobernanza/convocatorias");
    return { success: true, status };
  } catch (error: any) {
    console.error("Error closing assembly:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Inicia formalmente una convocatoria / asamblea:
 * 1. Verifica permisos (excluyendo rol Master).
 * 2. Transiciona el estatus de la convocatoria a "En Proceso" en la base de datos.
 * 3. Transiciona la fecha de la sesión indicada a "En Proceso".
 * 4. Opcionalmente (o por defecto si sendEmails: true) envía los correos institucionales a convocados y especiales.
 * 5. Revalida todas las rutas pertinentes.
 */
export async function startAnnouncementAction(
  announcementId: string,
  options?: { dateId?: string; sendEmails?: boolean }
) {
  try {
    await assertPermission(MODULES.CONVOCATORIAS, "canUpdate");
    const session = await getCurrentSession();
    if (session?.userId && await isCallerMasterUser(session.userId)) {
      return {
        success: false,
        error: "El usuario con rol Master no tiene autorización para iniciar o modificar convocatorias.",
      };
    }

    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        dates: { where: { isActive: true }, orderBy: { date: "asc" } },
        status: true,
      },
    });

    if (!announcement) {
      return { success: false, error: "No se encontró la convocatoria." };
    }

    // Resolver estatus "En Proceso"
    let inProcessStatus = await prisma.announcementStatus.findFirst({
      where: {
        OR: [
          { name: { equals: "En Proceso", mode: "insensitive" } },
          { name: { equals: "Iniciada", mode: "insensitive" } },
        ],
      },
    });

    if (!inProcessStatus) {
      inProcessStatus = await prisma.announcementStatus.create({
        data: {
          name: "En Proceso",
          color: "#304854",
        },
      });
    }

    // Actualizar estado general de la convocatoria
    await prisma.announcement.update({
      where: { id: announcementId },
      data: { statusId: inProcessStatus.id },
    });

    // Actualizar el estado de la fecha/sesión
    const targetDateId = options?.dateId || announcement.dates[0]?.id;
    if (targetDateId) {
      await prisma.announcementDate.update({
        where: { id: targetDateId },
        data: { status: "En Proceso" },
      });
    }

    let emailResult = null;
    if (options?.sendEmails) {
      emailResult = await sendAnnouncementInvitationAction(announcementId);
    }

    revalidatePath("/gobernanza/convocatorias");
    revalidatePath(`/gobernanza/convocatorias/${announcementId}`);
    revalidatePath(`/gobernanza/convocatorias/${announcementId}/asamblea`);
    if (targetDateId) {
      revalidatePath(`/gobernanza/convocatorias/${announcementId}/asamblea/${targetDateId}`);
      revalidatePath(`/gobernanza/convocatorias/${announcementId}/asamblea/${targetDateId}/participar`);
    }

    return {
      success: true,
      targetDateId,
      status: "En Proceso",
      emailResult,
    };
  } catch (error: any) {
    console.error("Error starting announcement:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send an email invitation for the announcement to all convocados and special guests.
 * Emplea el remitente institucional verificado finanzas@info.valquirico.com,
 * la paleta institucional (#304854, #d0b685) y captura la respuesta real de Resend
 * distinguiendo entre entregas exitosas y rechazos de proveedor.
 */
export async function sendAnnouncementInvitationAction(announcementId: string) {
  try {
    await assertPermission(MODULES.CONVOCATORIAS, "canUpdate");
    const session = await getCurrentSession();
    if (session?.userId && await isCallerMasterUser(session.userId)) {
      return {
        success: false,
        error: "El usuario con rol Master no tiene autorización para enviar invitaciones de convocatorias.",
      };
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error("La variable de entorno RESEND_API_KEY no está configurada.");
    }

    const resend = new Resend(resendApiKey);

    // Fetch announcement details, invited positions, special guests and condominium
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        type: true,
        subtype: true,
        dates: {
          where: { isActive: true },
          orderBy: { date: "asc" },
        },
        topics: {
          orderBy: { order: "asc" },
        },
        invitedPositions: {
          where: { isActive: true },
          include: {
            position: {
              include: {
                assignments: {
                  where: { isActive: true },
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        specialGuests: {
          where: { isActive: true },
        },
        condominium: true,
      },
    });

    if (!announcement) {
      throw new Error("No se encontró la convocatoria.");
    }

    // Resolve all distinct valid recipient emails and names
    const recipientMap = new Map<string, string>(); // email -> name

    for (const invitedPos of announcement.invitedPositions) {
      const position = invitedPos.position;
      if (position && position.assignments) {
        for (const assignment of position.assignments) {
          const user = assignment.user;
          if (user && user.isActive) {
            const rawEmail = (
              user.email?.trim() ||
              user.personalEmail?.trim() ||
              user.businessEmail?.trim() ||
              ""
            ).toLowerCase();

            if (rawEmail && rawEmail.includes("@") && rawEmail.includes(".")) {
              const userName =
                [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
                user.businessName?.trim() ||
                "Condómino";
              if (!recipientMap.has(rawEmail)) {
                recipientMap.set(rawEmail, userName);
              }
            }
          }
        }
      }
    }

    for (const guest of announcement.specialGuests) {
      const guestEmail = (guest.email?.trim() || "").toLowerCase();
      if (guestEmail && guestEmail.includes("@") && guestEmail.includes(".")) {
        if (!recipientMap.has(guestEmail)) {
          recipientMap.set(guestEmail, guest.name?.trim() || "Invitado Especial");
        }
      }
    }

    const recipients = Array.from(recipientMap.entries()).map(([email, name]) => ({
      email,
      name,
    }));

    if (recipients.length === 0) {
      return {
        success: false,
        error: "No se encontraron destinatarios con correos válidos para esta convocatoria.",
      };
    }

    const condominiumName = announcement.condominium?.name || "Val'Quirico";
    const origin = await appOrigin();
    const portalUrl = `${origin}/gobernanza/convocatorias/${announcementId}`;

    const dateItems: AnnouncementDateEmailItem[] = announcement.dates.map((d) => ({
      callType: d.callType,
      formattedDate: new Date(d.date).toLocaleDateString("es-MX", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: d.time,
      location: d.location,
    }));

    const topicsList = announcement.topics.map((t) => t.title);

    const fromSender = getEffectiveSenderEmail(condominiumName);
    const documentLabel =
      announcement.type.name.toLowerCase().includes("reunion") ||
      announcement.subtype.name.toLowerCase().includes("reunion")
        ? "Reunión"
        : "Convocatoria";

    const emailSubject = `${condominiumName} - ${documentLabel}: ${announcement.name}`;

    let sentCount = 0;
    let failedCount = 0;
    const sendErrors: { recipient: string; error: string }[] = [];

    // Enviar correos individuales con captura rigurosa de errores de proveedor
    for (const { email, name } of recipients) {
      const emailHtml = buildAnnouncementInvitationEmailHtml({
        recipientName: name,
        condominiumName,
        announcementName: announcement.name,
        typeName: announcement.type.name,
        subtypeName: announcement.subtype.name,
        dates: dateItems,
        portalUrl,
        pdfUrl: announcement.pdfUrl ? absoluteFileUrl(announcement.pdfUrl, origin) : null,
        topics: topicsList,
      });

      try {
        const { data, error } = await resend.emails.send({
          from: fromSender,
          to: email,
          subject: emailSubject,
          html: emailHtml,
        });

        if (error) {
          console.error(`[Resend Error] Failed sending announcement email to ${email}:`, error);
          failedCount++;
          sendErrors.push({
            recipient: email,
            error: error.message || "Error devuelto por el servicio de correo",
          });
        } else {
          sentCount++;
        }
      } catch (err: any) {
        console.error(`[Exception] Failed sending announcement email to ${email}:`, err);
        failedCount++;
        sendErrors.push({
          recipient: email,
          error: err?.message || "Excepción de conexión con el proveedor",
        });
      }
    }

    // Actualizar estatus general a "En Proceso"
    const inProcessStatus = await prisma.announcementStatus.findFirst({
      where: {
        OR: [
          { name: { equals: "En Proceso", mode: "insensitive" } },
          { name: { equals: "Iniciada", mode: "insensitive" } },
        ],
      },
    });

    if (inProcessStatus) {
      await prisma.announcement.update({
        where: { id: announcementId },
        data: { statusId: inProcessStatus.id },
      });
    }

    revalidatePath("/gobernanza/convocatorias");
    revalidatePath(`/gobernanza/convocatorias/${announcementId}`);

    const isSuccess = sentCount > 0;
    return {
      success: isSuccess,
      sentCount,
      failedCount,
      total: recipients.length,
      errors: sendErrors,
      message:
        failedCount === 0
          ? `Se enviaron exitosamente ${sentCount} correos de convocatoria.`
          : isSuccess
          ? `Se enviaron ${sentCount} de ${recipients.length} correos. Hubo ${failedCount} envíos con error.`
          : `No se pudo entregar ningún correo. Error del proveedor: ${sendErrors[0]?.error || "Desconocido"}`,
      error: !isSuccess ? sendErrors[0]?.error || "Error al enviar correos" : undefined,
    };
  } catch (error: any) {
    console.error("Error in sendAnnouncementInvitationAction:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Build a WhatsApp-ready plain-text version of the announcement invitation.
 * Returns { text, recipients } so the client can trigger WhatsApp delivery.
 */
export async function getAnnouncementWhatsAppTextAction(announcementId: string) {
  try {
    await assertPermission([MODULES.CONVOCATORIAS, MODULES.CONVOCATORIAS_CONDOMINO], "canRead");
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        type: true,
        subtype: true,
        dates: {
          where: { isActive: true },
          orderBy: { date: "asc" },
        },
        condominium: true,
        topics: { orderBy: { order: "asc" } },
        invitedPositions: {
          include: {
            position: {
              include: {
                assignments: {
                  where: { isActive: true },
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!announcement) throw new Error("No se encontró la convocatoria.");

    const condominiumName = announcement.condominium?.name || "Val'Quirico";
    const announcementName = announcement.name;
    const typeName = announcement.type.name;
    const subtypeName = announcement.subtype.name;

    const isReunion =
      typeName.toLowerCase().includes("reunion") ||
      subtypeName.toLowerCase().includes("reunion");

    const documentLabel = isReunion ? "Reunión" : "Convocatoria";

    const origin = await appOrigin();
    const portalUrl = `${origin}/gobernanza/convocatorias/${announcementId}`;

    const emojiHouse = String.fromCodePoint(0x1f3e0);
    const emojiCalendar = String.fromCodePoint(0x1f4c5);
    const emojiSpiralCalendar = String.fromCodePoint(0x1f5d3);
    const emojiClipboard = String.fromCodePoint(0x1f4cb);
    const emojiPage = String.fromCodePoint(0x1f4c4);
    const emojiCheck = String.fromCodePoint(0x2705);

    const callsText = announcement.dates
      .map((d) => {
        const formattedDate = new Date(d.date).toLocaleDateString("es-MX", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        return `${emojiSpiralCalendar} *${d.callType}*\nFecha: ${formattedDate}${d.time ? ` a las ${d.time} hrs` : ""}\nLugar: ${d.location || "No especificado"}`;
      })
      .join("\n\n");

    const topicsText =
      announcement.topics.length > 0
        ? `\n\n${emojiClipboard} *Orden del día:*\n` +
          announcement.topics.map((t, i) => `${i + 1}. ${t.title}`).join("\n")
        : "";

    const pdfText = announcement.pdfUrl
      ? `\n\n${emojiPage} PDF: ${absoluteFileUrl(announcement.pdfUrl, origin)}`
      : "";

    const text = `${emojiHouse} *${condominiumName}*
${documentLabel}: *${announcementName}*
(${typeName} - ${subtypeName})

Apreciable condómino,

Le hacemos llegar la invitación para la ${documentLabel.toLowerCase()} que se llevará a cabo en el condominio.

${emojiCalendar} *Detalles del llamado:*

${callsText}${topicsText}

${emojiCheck} *Instrucciones para participar:*
1. Acceda al portal del condominio: ${portalUrl}
2. Inicie sesión con su cuenta de condómino.
3. Presione el botón "Participar en ${isReunion ? "reunión" : "asamblea"}".
4. Confirme su asistencia y emita sus votos en el orden del día.

Agradecemos de antemano su puntual asistencia y participación.
Atentamente, Administración de ${condominiumName}.${pdfText}`;

    const recipients: { name: string; position: string; phone: string }[] = [];
    const seenUsers = new Set<string>();

    for (const ip of announcement.invitedPositions) {
      const positionName = ip.position.name;
      for (const ass of ip.position.assignments) {
        if (ass.user && ass.user.isActive) {
          const userId = ass.user.id;
          const phone = ass.user.phone || ass.user.personalPhone || ass.user.businessPhone;
          const cleanPhone = phone ? phone.replace(/[^0-9]/g, "") : "";

          if (cleanPhone && !seenUsers.has(userId + "_" + cleanPhone)) {
            seenUsers.add(userId + "_" + cleanPhone);
            const displayName =
              [ass.user.firstName, ass.user.lastName].filter(Boolean).join(" ").trim() ||
              ass.user.businessName?.trim() ||
              "Condómino";

            recipients.push({
              name: displayName,
              position: positionName,
              phone: cleanPhone,
            });
          }
        }
      }
    }

    return { success: true, text, recipients };
  } catch (error: any) {
    console.error("Error building WhatsApp text:", error);
    return { success: false, error: error.message, text: "", recipients: [] };
  }
}
