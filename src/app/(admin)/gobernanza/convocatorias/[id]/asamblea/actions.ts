"use server";
import { assertPermission } from "@/shared/application/auth/guards";
import { MODULES } from "@/shared/application/auth/modules";

import { prisma } from "@/shared/infrastructure/db/prisma";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { headers } from "next/headers";

/**
 * Toggle attendance for a given position ID in the specific date called session.
 * Stores a comma-separated list of present position IDs.
 */
export async function toggleAttendanceAction(dateId: string, positionId: string, isPresent: boolean) {
  try {
    await assertPermission([MODULES.CONVOCATORIAS, MODULES.CONVOCATORIAS_CONDOMINO], "canRead");
    const callDate = await prisma.announcementDate.findUnique({
      where: { id: dateId }
    });

    if (!callDate) throw new Error("Called date not found");

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
    return { success: true, checkedPositions: updated.checkedPositions };
  } catch (error: any) {
    console.error("Error toggling attendance:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Cast or update a vote on a specific agenda topic for a given position.
 * Stores the vote mappings as a serialized JSON string in the database.
 */
export async function registerVoteAction(topicId: string, positionId: string, voteType: string) {
  try {
    await assertPermission([MODULES.CONVOCATORIAS, MODULES.CONVOCATORIAS_CONDOMINO], "canRead");
    const topic = await prisma.announcementTopic.findUnique({
      where: { id: topicId }
    });

    if (!topic) throw new Error("Topic not found");

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
 * Save topic text conclusions/comments.
 */
export async function saveTopicConclusionsAction(topicId: string, conclusions: string) {
  try {
    await assertPermission(MODULES.CONVOCATORIAS, "canUpdate");
    const updated = await prisma.announcementTopic.update({
      where: { id: topicId },
      data: { conclusions }
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
    const status = isCompleted ? "Realizada" : "No Realizada";
    
    const updatedDate = await prisma.announcementDate.update({
      where: { id: dateId },
      data: { status }
    });

    // Also update overall parent Announcement status to "Realizada" / "Concluida"
    const callDate = await prisma.announcementDate.findUnique({
      where: { id: dateId },
      include: { announcement: true }
    });

    if (callDate) {
      const closedStatus = await prisma.announcementStatus.findFirst({
        where: { name: { contains: isCompleted ? "Terminada" : "Cancelada" } }
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
 * Send an email invitation for the announcement to all convocados and special guests.
 */
export async function sendAnnouncementInvitationAction(announcementId: string) {
  try {
    await assertPermission(MODULES.CONVOCATORIAS, "canUpdate");
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error("La variable de entorno RESEND_API_KEY no está configurada.");
    }

    const resend = new Resend(resendApiKey);

    // Fetch the announcement details, invited positions, special guests and condominium
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        type: true,
        subtype: true,
        dates: {
          where: { isActive: true },
          orderBy: { date: "asc" }
        },
        invitedPositions: {
          where: { isActive: true },
          include: {
            position: {
              include: {
                assignments: {
                  where: { isActive: true },
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        },
        specialGuests: {
          where: { isActive: true }
        },
        condominium: true
      }
    });

    if (!announcement) {
      throw new Error("No se encontró la convocatoria.");
    }

    // Resolve all distinct valid emails
    const emailSet = new Set<string>();

    for (const invitedPos of announcement.invitedPositions) {
      const position = invitedPos.position;
      if (position && position.assignments) {
        for (const assignment of position.assignments) {
          const user = assignment.user;
          if (user) {
            const email = user.email || user.personalEmail || user.businessEmail;
            if (email && email.trim() !== "") {
              emailSet.add(email.trim().toLowerCase());
            }
          }
        }
      }
    }

    for (const guest of announcement.specialGuests) {
      if (guest.email && guest.email.trim() !== "") {
        emailSet.add(guest.email.trim().toLowerCase());
      }
    }

    const emails = Array.from(emailSet);
    if (emails.length === 0) {
      return { success: false, error: "No se encontraron destinatarios con correos válidos para esta convocatoria." };
    }

    const condominiumName = announcement.condominium.name;
    const announcementName = announcement.name;
    const typeName = announcement.type.name;
    const subtypeName = announcement.subtype.name;

    const cleanTypeName = typeName.replace(/reunion/gi, "Reunión");
    const cleanSubtypeName = subtypeName.replace(/reunion/gi, "Reunión");

    const isReunion = 
      typeName.toLowerCase().includes("reunion") || 
      subtypeName.toLowerCase().includes("reunion");

    const documentLabel = isReunion ? "reunión" : "convocatoria";
    const documentLabelCap = isReunion ? "Reunión" : "Convocatoria";

    const introParagraph = isReunion
      ? `Le hacemos llegar la invitación para la reunión <strong>${announcementName}</strong> (${cleanTypeName} - ${cleanSubtypeName}) que se llevará a cabo en el condominio.`
      : `Le hacemos llegar la convocatoria para la <strong>${announcementName}</strong> (${cleanTypeName} - ${cleanSubtypeName}) que se llevará a cabo en el condominio.`;

    // Generate calls list HTML
    let callsHtml = "";
    for (const dateVal of announcement.dates) {
      const formattedDate = new Date(dateVal.date).toLocaleDateString("es-MX", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      callsHtml += `
        <div style="margin-bottom: 15px; padding: 15px; background-color: #fcf9f5; border-radius: 8px; border: 1px solid #e8dbcc;">
          <p style="margin: 0; font-size: 14px; font-weight: bold; color: #6d422a;">${dateVal.callType}</p>
          <p style="margin: 5px 0 0; font-size: 14px; color: #2f221a;"><strong>Fecha:</strong> ${formattedDate} a las ${dateVal.time || ""} hrs</p>
          <p style="margin: 5px 0 0; font-size: 14px; color: #2f221a;"><strong>Lugar:</strong> ${dateVal.location || "No especificado"}</p>
        </div>
      `;
    }

    const hostHeader = (await headers()).get("host") || "insulae.sistemasabanza.com";
    const proto = hostHeader.includes("localhost") ? "http" : "https";
    const portalUrl = `${proto}://${hostHeader}/gobernanza/convocatorias/${announcementId}`;

    const emailSubject = `${condominiumName} - ${documentLabelCap}: ${announcementName}`;

    const emailBody = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invitación ${documentLabelCap}</title>
        </head>
        <body style="background-color: #fcf9f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px; margin: 0;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-collapse: collapse; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(109, 66, 42, 0.08); border: 1px solid #e8dbcc;">
            <tbody>
              <!-- Header -->
              <tr>
                <td style="background-color: #6d422a; padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px; text-transform: uppercase;">
                    ${condominiumName}
                  </h1>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 40px 30px; color: #2f221a;">
                  <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                    Apreciable condómino,
                  </p>
                  <p style="font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                    ${introParagraph}
                  </p>

                  <h3 style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #6d422a; margin: 0 0 15px 0; border-bottom: 2px solid #e8dbcc; padding-bottom: 5px;">
                    Detalles del llamado
                  </h3>
                  
                  ${callsHtml}

                  ${
                    announcement.pdfUrl
                      ? `
                        <div style="margin-top: 20px; text-align: center;">
                          <a href="${announcement.pdfUrl}" target="_blank" style="background-color: #ffffff; border: 1px solid #e8dbcc; color: #6d422a; text-decoration: none; padding: 10px 20px; font-size: 13px; font-weight: bold; border-radius: 9999px; display: inline-block; box-shadow: 0 2px 6px rgba(109, 66, 42, 0.04);">
                            Ver PDF de la ${documentLabel}
                          </a>
                        </div>
                      `
                      : ""
                  }

                  <div style="margin-top: 30px; padding: 20px; background-color: #fcf9f5; border-radius: 12px; border: 1px solid #e8dbcc;">
                    <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: bold; color: #6d422a; text-transform: uppercase; letter-spacing: 0.5px;">
                      Instrucciones para Participar y Votar:
                    </h4>
                    <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #2f221a; line-height: 1.6;">
                      <li style="margin-bottom: 8px;">Haga clic en el botón de abajo para acceder a la ${documentLabel}.</li>
                      <li style="margin-bottom: 8px;">Inicie sesión en el portal con su cuenta de condómino.</li>
                      <li style="margin-bottom: 8px;">En la pantalla de la ${documentLabel}, presione el botón <strong>"${isReunion ? "Participar en reunión" : "Participar en asamblea"}"</strong>.</li>
                      <li>Confirme su asistencia en las propiedades que representa y emita sus votos en el orden del día.</li>
                    </ol>
                    <div style="margin-top: 20px; text-align: center;">
                      <a href="${portalUrl}" target="_blank" style="background-color: #6d422a; color: #ffffff; text-decoration: none; padding: 12px 25px; font-size: 14px; font-weight: bold; border-radius: 9999px; display: inline-block; box-shadow: 0 2px 10px rgba(109, 66, 42, 0.2); text-transform: uppercase; letter-spacing: 0.5px;">
                        Acceder al Portal de ${isReunion ? "Reunión" : "Asamblea"}
                      </a>
                    </div>
                  </div>
                  
                  <div style="margin-top: 35px; border-top: 1px solid #e8dbcc; padding-top: 20px;">
                    <p style="font-size: 16px; line-height: 1.6; margin: 0; font-weight: bold;">
                      Agradecemos de antemano su puntual asistencia y participación.
                    </p>
                    <p style="font-size: 14px; color: #958172; margin: 5px 0 0 0;">
                      Saludos cordiales, <br/>
                      Administración de ${condominiumName}
                    </p>
                  </div>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #f7f9fa; padding: 20px 30px; text-align: center; font-size: 11px; color: #958172; border-top: 1px solid #e8dbcc;">
                  Recibió este correo porque está registrado en el sistema condominal de ${condominiumName}. 
                  Si hay un error en esta información, por favor póngase en contacto con la administración.
                </td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    // Send individual emails using Resend to avoid listing all recipients in CC/TO
    let sentCount = 0;
    let failedCount = 0;

    for (const email of emails) {
      try {
        await resend.emails.send({
          from: `Condominio ${condominiumName} <gobernanza@insulae.sistemasabanza.com>`,
          to: email,
          subject: emailSubject,
          html: emailBody
        });
        sentCount++;
      } catch (err) {
        console.error(`Error sending email to ${email}:`, err);
        failedCount++;
      }
    }

    // Update parent Announcement status to "En Proceso"
    const inProcessStatus = await prisma.announcementStatus.findFirst({
      where: { name: { contains: "En Proceso", mode: "insensitive" } }
    });

    if (inProcessStatus) {
      await prisma.announcement.update({
        where: { id: announcementId },
        data: { statusId: inProcessStatus.id }
      });
    }

    revalidatePath("/gobernanza/convocatorias");
    revalidatePath(`/gobernanza/convocatorias/${announcementId}`);

    return {
      success: true,
      sentCount,
      failedCount,
      total: emails.length
    };
  } catch (error: any) {
    console.error("Error in sendAnnouncementInvitationAction:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Build a WhatsApp-ready plain-text version of the announcement invitation.
 * Returns { text, phone } so the client can open wa.me/{phone}?text={text}
 */
export async function getAnnouncementWhatsAppTextAction(announcementId: string) {
  try {
    await assertPermission(MODULES.CONVOCATORIAS, "canRead");
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId },
      include: {
        type: true,
        subtype: true,
        dates: {
          where: { isActive: true },
          orderBy: { date: "asc" }
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
                    user: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!announcement) throw new Error("No se encontró la convocatoria.");

    const condominiumName = announcement.condominium.name;
    const announcementName = announcement.name;
    const typeName = announcement.type.name;
    const subtypeName = announcement.subtype.name;

    const isReunion =
      typeName.toLowerCase().includes("reunion") ||
      subtypeName.toLowerCase().includes("reunion");

    const documentLabel = isReunion ? "Reunión" : "Convocatoria";

    const hostHeader = (await headers()).get("host") || "sassi-v2.vercel.app";
    const proto = hostHeader.includes("localhost") ? "http" : "https";
    const portalUrl = `${proto}://${hostHeader}/gobernanza/convocatorias/${announcementId}`;

    const emojiHouse = String.fromCodePoint(0x1F3E0);
    const emojiCalendar = String.fromCodePoint(0x1F4C5);
    const emojiSpiralCalendar = String.fromCodePoint(0x1F5D3);
    const emojiClipboard = String.fromCodePoint(0x1F4CB);
    const emojiPage = String.fromCodePoint(0x1F4C4);
    const emojiCheck = String.fromCodePoint(0x2705);

    const callsText = announcement.dates.map((d) => {
      const formattedDate = new Date(d.date).toLocaleDateString("es-MX", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      return `${emojiSpiralCalendar} *${d.callType}*\nFecha: ${formattedDate} a las ${d.time || ""} hrs\nLugar: ${d.location || "No especificado"}`;
    }).join("\n\n");

    const topicsText = announcement.topics.length > 0
      ? `\n\n${emojiClipboard} *Orden del día:*\n` + announcement.topics.map((t, i) => `${i + 1}. ${t.title}`).join("\n")
      : "";

    const pdfText = announcement.pdfUrl
      ? `\n\n${emojiPage} PDF: ${announcement.pdfUrl}`
      : "";

    const text =
`${emojiHouse} *${condominiumName}*
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
            const displayName = [ass.user.firstName, ass.user.lastName].filter(Boolean).join(" ") 
              || ass.user.businessName 
              || "Condómino";
            
            recipients.push({
              name: displayName,
              position: positionName,
              phone: cleanPhone
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
