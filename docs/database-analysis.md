# Auditoria completa de Insulae (legacy PHP + MySQL)

Fecha de auditoria: 2026-03-27
Repositorio analizado: /Users/gabrielhernandez/projects/valquirico/insulae
Base analizada: sistemasabanza_insulaeValquirico (MySQL remoto)

## 1) Resumen ejecutivo

- Archivos totales en legacy: 3,014
- Archivos PHP: 803
- Tablas en BD: 79
- Registros totales reales: 76,360
- Lineas con SQL detectadas en PHP: 902
- Includes/requires detectados: 661
- Marcadores de estado global/superglobales: 1,902
- Tablas sin referencia directa en PHP: 8
- Tablas con 0 registros: 19
- Tablas sin PK: 2

Conclusiones de alto nivel:

1. El sistema es altamente relacional y orientado a transacciones financieras.
2. Existe deuda tecnica severa por SQL embebido y concatenado, acoplamiento por includes y uso de estado global.
3. Se detectaron artefactos de backup/debug/fix mezclados con codigo productivo.
4. Existen relaciones no declaradas (columnas id_* sin FK) que deben reconstruirse en migracion.

## 2) Fase 1 - Inspeccion del proyecto PHP por modulo

A continuacion se entrega el inventario por modulo en el formato solicitado.

### MODULO: Resumenes financieros
Archivos involucrados:
- resumen_financiero.php
- resumen_financiero1.php
- resumen_financiero2.php
- resumen_financiero_nuevo.php
- includes/resumen_financiero/_config.php
- includes/resumen_financiero/seccion_ordinarias_ingresos.php
- includes/resumen_financiero/seccion_ordinarias_egresos.php
- includes/resumen_financiero/seccion_ordinarias_otros_ingresos.php
- reporte_condominio.php

Tablas usadas:
- RESUMEN_FINANCIERO
- PAGOS
- HISTORICO_PAGOS
- HISTORICO_PAGOS_DETALLE
- INGRESOS
- GASTOS
- PRESUPUESTO
- PRESUPUESTO_DETALLE
- PRESUPUESTO_MES
- CAT_CONCEPTOS_PRESUPUESTO
- CAT_GRUPOS_PRESUPUESTO
- CAT_GRUPOS_COBRO
- AREAS_PRIVATIVAS
- AREAS_PRIVATIVAS_HAS_DCAT_USO_SUELO
- DCAT_USO_SUELO
- DCAT_ZONAS
- DCAT_VARIOS

Operaciones:
- Consulta
- Edicion (parcial, por SQL UPDATE detectado)

Problemas detectados:
- Query de REINOS repetida en multiples archivos (121 incidencias globales).
- SQL embebido y concatenado con variables de sesion.
- Reporteria con logica de negocio acoplada al render HTML/PHP.
- Dependencia fuerte en tablas agregadas sin contrato de dominio.

### MODULO: Cuotas ordinarias / extraordinarias / cobros / pagos
Archivos involucrados:
- listado_pagos.php
- listado_pagos_exp.php
- listado_pagos_imp.php
- listado_pagos_impTABLAS.php
- listado_historico_pagos.php
- formulario_pagos_hitorico.php
- formulario_pagos_hitorico_completo.php
- formulario_pagos_futuros.php
- ajax-previaCobros.php
- ajax-cobroHistorico.php
- ajax-cobroHistorico_completo.php
- reporte_cuotas.php
- reporte_cuotas_extraordinaria.php
- reporte_cuotas_extraordinariaCONANTICIPADO.php

Tablas usadas:
- PAGOS
- HISTORICO_PAGOS
- HISTORICO_PAGOS_DETALLE
- HISTORICO_PAGOS_HAS_PAGOS
- CAT_GRUPOS_COBRO
- CAT_FORMAS_PAGO
- CAT_SANCIONES
- DIRECTORIO
- DIRECTORIO_HAS_ASIGNACIONES
- DIRECTORIO_HAS_COMERCIOS
- AREAS_PRIVATIVAS
- AREAS_PRIVATIVAS_HAS_DCAT_USO_SUELO
- ARRENDAMIENTOS
- INGRESOS
- DCAT_USO_SUELO
- DCAT_USO_SUELO_HISTORICO
- DCAT_ZONAS
- DCAT_VARIOS

Operaciones:
- Consulta

Problemas detectados:
- Conciliacion de pagos distribuida en varios scripts y reportes.
- Uso de SQL concatenado con $_POST en procesos de guardado/cobro.
- Reglas financieras mezcladas con presentacion.
- Dependencias implcitas entre PAGOS e HISTORICO_* sin capa de dominio.

### MODULO: Ingresos
Archivos involucrados:
- formulario_ingreso.php
- listado_ingresos.php
- ajax-importar-ingresos.php
- importador_ingresos.php
- apply_migration_ingresos.php
- apply_migration_tipo_cuota_ingresos.php
- backup_ingresos.php
- includes/resumen_financiero/seccion_ordinarias_ingresos.php
- includes/resumen_financiero/seccion_ordinarias_otros_ingresos.php

Tablas usadas:
- INGRESOS
- CAT_FORMAS_PAGO
- CAT_GRUPOS_COBRO
- AREAS_PRIVATIVAS
- DCAT_VARIOS

Operaciones:
- Alta
- Consulta
- Edicion

Problemas detectados:
- Scripts de migracion operativa conviven con UI de produccion.
- Inserciones dinamicas con concatenacion de variables.
- Validacion y normalizacion insuficiente de conceptos/tipo cuota.

### MODULO: Egresos
Archivos involucrados:
- formulario_gasto.php
- listado_gastos.php
- formulario_categoria_gasto.php
- listado_categorias_gastos.php
- ajax-importar-gastos.php
- importador_gastos.php

Tablas usadas:
- GASTOS
- CAT_CONCEPTOS_PRESUPUESTO
- CAT_FORMAS_PAGO
- CAT_GRUPOS_COBRO
- CAT_GRUPOS_PRESUPUESTO
- DCAT_CATEGORIAS_GASTOS
- PRESUPUESTO

Operaciones:
- Alta
- Consulta

Problemas detectados:
- Acoplamiento a catalogos historicos de presupuesto.
- SQL y transformaciones de importacion en el mismo archivo PHP.

### MODULO: Presupuestos
Archivos involucrados:
- presupuesto.php
- presupuesto_antes_tabla.php
- presupuesto_backup.php
- presupuesto_imp.php
- listado_estructura_presupuesto.php
- formulario_estructura_presupuesto.php
- ajax-conceptos-presupuesto.php
- ajax-importar-presupuesto.php
- importador_presupuesto.php
- debug_presupuesto_2025.php

Tablas usadas:
- PRESUPUESTO
- PRESUPUESTO_DETALLE
- PRESUPUESTO_MES
- PRESUPUESTO_MES_CERRADO
- CAT_CONCEPTOS_PRESUPUESTO
- CAT_GRUPOS_PRESUPUESTO
- CAT_GRUPOS_COBRO
- CAT_TIPOS_CONCEPTO
- GASTOS
- PROYECTOS

Operaciones:
- Alta
- Consulta
- Edicion

Problemas detectados:
- Duplicidad de tablas de catalogo con backups (_BACKUP_20260203).
- Inserciones repetidas de detalle/mes en loops sin transacciones robustas.
- Versionado anual hecho con scripts ad hoc.

### MODULO: Directorio
Archivos involucrados:
- formulario_directorio.php
- listado_directorio.php
- formulario_contacto.php
- formulario_profesional.php
- ajax-directorioComercio.php
- ajax-directorioFC.php
- nuevoDirectorio.php
- nuevoDirectorioLegal.php
- nuevoDirectorioMoral.php

Tablas usadas:
- DIRECTORIO
- DIRECTORIO_HAS_ASIGNACIONES
- DIRECTORIO_HAS_COMERCIOS
- CONTACTOS
- AREAS_PRIVATIVAS
- ROLES_CONDOMINAL
- PROYECTOS

Operaciones:
- Consulta

Problemas detectados:
- Mismo dominio representado en varias variantes de formulario.
- Roles y asignaciones dispersos entre tablas y scripts.
- Alto riesgo de inconsistencia de datos de contacto.

### MODULO: Areas privativas / uso de suelo / arrendamientos
Archivos involucrados:
- formulario_apol.php
- formulario_apol_fusion.php
- formulario_apol_imagenes.php
- listado_apoles.php
- listado_apoles-bckp.php
- listado_apolesDinamico.php
- listado_apoles_seguridad.php
- listado_arrendamientos.php
- listado_rentas.php
- listado_zonas.php
- disponibilidad_uso_suelo.php
- formulario_arrendamiento.php
- ajax-subzonas.php
- scriptAPZonas.php
- script_limpiar_area_privativa.php
- assets-list-apoles/*

Tablas usadas:
- AREAS_PRIVATIVAS
- AREAS_PRIVATIVAS_HAS_CUOTAS
- AREAS_PRIVATIVAS_HAS_DCAT_USO_SUELO
- AREAS_PRIVATIVAS_IMAGENES
- ARRENDAMIENTOS
- DCAT_USO_SUELO
- DCAT_USO_SUELO_HISTORICO
- DCAT_ZONAS
- DCAT_SUBZONAS
- DCAT_CALLES
- DCAT_CATEGORIAS_COMERCIAL
- DCAT_SUBCATEGORIAS_COMERCIAL
- DCAT_CLASES_COMERCIOS
- DCAT_GIROS
- DIRECTORIO
- DIRECTORIO_HAS_ASIGNACIONES
- DIRECTORIO_HAS_COMERCIOS
- PAGOS
- HISTORICO_PAGOS
- HISTORICO_PAGOS_DETALLE
- HISTORICO_PAGOS_HAS_PAGOS
- CAT_GRUPOS_COBRO
- ROLES_CONDOMINAL
- PROYECTOS

Operaciones:
- Alta
- Consulta
- Edicion
- Eliminacion

Problemas detectados:
- Modulo mas acoplado y transversal del sistema.
- Mezcla de reglas de arrendamiento, metrico y cobro en mismo flujo.
- Evidencia de archivos backup en rutas activas.

### MODULO: Estructuras condominales / organigrama / roles
Archivos involucrados:
- organigrama.php
- organigrama_editar.php
- ajax-guardado-organigrama.php
- formulario_estructura_condominal.php
- listado_estructura_condominal.php
- formulario_rol_condominal.php
- listado_roles_condominal.php

Tablas usadas:
- ROLES_CONDOMINAL
- ROLES_CONDOMINAL_HAS_CAT_MODULOS
- CAT_MODULOS
- CAT_PUESTOS
- CAT_GRUPO_PUESTOS
- DIRECTORIO
- DIRECTORIO_HAS_CAT_PUESTOS

Operaciones:
- Consulta

Problemas detectados:
- Permisos modelados en tablas legacy sin versionamiento ni auditoria.
- Dependencia de includes comunes para autorizacion contextual.

### MODULO: Convocatorias / asambleas / votaciones
Archivos involucrados:
- asamblea.php
- asamblea_condomino.php
- FRM_VoteTopic_asamblea.php
- FRM_VoteTopic_asamblea_condomino.php
- formulario_convocatoria.php
- formulario_convocatoria_consulta.php
- listado_convocatorias.php
- listado_convocatorias_condomino.php
- detalle_gobernanza_convocatoria.php
- ajax-RegistrarAsistenciaAsamblea.php
- ajax-RegistrarVotos.php

Tablas usadas:
- CONVOCATORIAS
- CONVOCATORIAS_FECHAS
- CONVOCATORIAS_INVITADOS
- CONVOCATORIAS_HAS_INVITADOS_ESPECIALES
- CONVOCADOS
- ASISTENCIAS_CONVOCATORIA
- TEMAS
- VOTACIONES_CONVOCATORIAS
- INVITADOS_ESPECIALES
- CAT_TIPOS_CONVOCATORIAS
- CAT_SUBTIPOS_CONVOCATORIAS
- CAT_TIPOS_TEMAS
- CAT_LLAMAR_A
- CAT_PUESTOS
- CAT_GRUPO_PUESTOS
- DCAT_TIPOS_FECHAS_CONVOCATORIAS
- DIRECTORIO
- DIRECTORIO_HAS_ASIGNACIONES
- DIRECTORIO_HAS_CAT_PUESTOS
- AREAS_PRIVATIVAS
- TAREAS
- TAREAS_ASIGNACIONES
- ROLES_CONDOMINAL
- PROYECTOS

Operaciones:
- Alta
- Consulta
- Edicion
- Eliminacion

Problemas detectados:
- Tablas con 0 registros en el snapshot (riesgo de modulo inactivo/incompleto).
- Lotes de SQL con condiciones de negocio en vistas PHP.
- Alta complejidad de joins para votacion y quorums.

### MODULO: Tickets / notificaciones / tareas
Archivos involucrados:
- listado_tickets.php
- formulario_ticket.php
- listado_departamentos_tickets.php
- formulario_departamentos_tickets.php
- listado_notificaciones.php
- formulario_notificacion.php
- formulario_categoria_notificacion.php
- listado_categorias_notificaciones.php
- formulario_llamado.php
- ajax-Tareas.php
- ajax-TasksUpdate.php
- ajax-newTask.php

Tablas usadas:
- TICKETS
- TICKETS_DEPARTAMENTOS
- NOTIFICACIONES
- CAT_TIPOS_NOTIFICACIONES
- DCAT_CATEGORIAS_NOTIFICACIONES
- TAREAS
- DIRECTORIO
- CONVOCATORIAS
- CONVOCATORIAS_FECHAS
- DCAT_TIPOS_FECHAS_CONVOCATORIAS
- PROYECTOS

Operaciones:
- Consulta
- Edicion

Problemas detectados:
- Tareas y notificaciones parcialmente acopladas a convocatorias.
- Estado de tickets sin estandar de workflow central.

### MODULO: Auth / roles / permisos
Archivos involucrados:
- Auth/nxs_auth.inc.php
- cliente/Auth/nxs_auth.inc.php
- autentificacion.php
- cliente/autentificacion.php
- permisos.php
- cliente/permisos.php
- login-header.php
- login-footer.php
- recupera.php
- formulario_nvopass.php
- ajax-recuperarPass.php
- verificarPass.php
- check_roles.php

Tablas usadas:
- DIRECTORIO
- DIRECTORIO_HAS_ASIGNACIONES
- DIRECTORIO_HAS_COMERCIOS
- ROLES_CONDOMINAL
- ROLES_CONDOMINAL_HAS_CAT_MODULOS
- CAT_MODULOS

Operaciones:
- Alta
- Consulta

Problemas detectados:
- Doble implementacion de auth (raiz y /cliente).
- Dependencia de sesiones legacy y SHA1 historico.
- Password reset con tabla no referenciada desde modulo principal.

### MODULO: Documentos PDF / proyectos
Archivos involucrados:
- formulario_proyecto.php
- contratoPDF.php
- imp-recibo.php
- formulario_reglamentos.php
- reporte_condominio.php

Tablas usadas:
- PROYECTOS
- PROYECTOS_DOCUMENTOS
- DIRECTORIO
- ROLES_CONDOMINAL
- PAGOS
- HISTORICO_PAGOS
- HISTORICO_PAGOS_DETALLE
- HISTORICO_PAGOS_HAS_PAGOS
- AREAS_PRIVATIVAS
- ARRENDAMIENTOS

Operaciones:
- Consulta
- Edicion

Problemas detectados:
- Almacenamiento documental no centralizado para SaaS moderno.
- Generacion PDF acoplada a flujo de negocio y reportes.

## 3) Hallazgos transversales de calidad

### 3.1 Includes repetidos
Top includes detectados:
- funciones-bd.php (124)
- Auth/nxs_auth.inc.php (108)
- general.php (96)
- permisos.php (94)
- navsections.php (74)
- funciones.php (65)

Impacto:
- Acoplamiento alto.
- Inicializacion y seguridad distribuidas.

### 3.2 Variables globales y superglobales
- Uso de $GLOBALS/global: 57 muestras (solo muestra parcial, total de marcadores: 1,902).
- Uso intensivo de $_POST, $_GET y $_SESSION dentro de SQL.

Impacto:
- Dificulta testeo, trazabilidad y seguridad.

### 3.3 SQL embebido y concatenado
- 902 lineas SQL detectadas.
- 194 muestras de SQL con variables dinamicas de request/sesion.
- Query repetida de contexto REINOS: 121 incidencias.

Impacto:
- Riesgo de inyeccion SQL.
- Duplicacion de reglas.
- Mantenimiento costoso.

### 3.4 Mezcla de logica de negocio y HTML
- 4,507 ocurrencias de mezcla de marcadores PHP/HTML en archivos PHP core.

Impacto:
- Baja separacion de responsabilidades.

### 3.5 Dependencias circulares
- En el analisis estatico de includes literales no se detectaron pares mutuos directos.
- Aun asi hay acoplamiento estructural fuerte por includes comunes y estado global compartido.

## 4) Fase 2 - Conexion MySQL y extraccion completa

Ejecuciones realizadas:
- brew services list
- /opt/homebrew/opt/mysql-client/bin/mysql --version
- /opt/homebrew/opt/mysql-client/bin/mysql -h sistemasabanza.com ... -e "SHOW DATABASES;"
- SHOW TABLES
- mysqldump --no-data --no-tablespaces
- mysqldump --no-tablespaces
- Consultas a information_schema para columnas, indices, PK/FK y metadata
- SELECT COUNT(*) por cada tabla

Resultado:
- BD objetivo confirmada: sistemasabanza_insulaeValquirico
- 79 tablas exportadas
- schema.sql y full_dump.sql generados en docs/raw-db

## 5) Fase 3 - Hallazgos de estructura y normalizacion

### 5.1 Tablas sin uso directo en PHP
- CUPONES_TOUR
- PASSWORD_RESET_TOKENS
- REGISTROS_VISITANTES
- TOURS
- artistas
- campos_contacto
- disponibilidad_artistas
- presentaciones_artistas

### 5.2 Tablas con 0 registros
19 tablas, entre ellas:
- CONVOCATORIAS, CONVOCATORIAS_FECHAS, CONVOCADOS
- TAREAS, TAREAS_ASIGNACIONES, TEMAS, VOTACIONES_CONVOCATORIAS
- ASISTENCIAS_CONVOCATORIA
- PASSWORD_RESET_TOKENS
- tablas de tours/artistas

### 5.3 Tablas backup/basura historica detectadas
- CAT_CONCEPTOS_PRESUPUESTO_BACKUP_20260203
- CAT_GRUPOS_PRESUPUESTO_BACKUP_20260203

### 5.4 Tablas sin PK
- CAT_CONCEPTOS_PRESUPUESTO_BACKUP_20260203
- CAT_GRUPOS_PRESUPUESTO_BACKUP_20260203

### 5.5 Relaciones N:N / intermedias detectadas
- AREAS_PRIVATIVAS_HAS_CUOTAS
- DIRECTORIO_HAS_ASIGNACIONES
- DIRECTORIO_HAS_CAT_PUESTOS
- HISTORICO_PAGOS_HAS_PAGOS
- ROLES_CONDOMINAL_HAS_CAT_MODULOS
- CONVOCATORIAS_HAS_INVITADOS_ESPECIALES
- (y otras de patron _HAS_)

### 5.6 Relaciones implicitas (faltan FK)
Se detectaron 167 columnas id_* sin FK declarado. Candidatos clave:
- PAGOS.id_areas_privativas -> AREAS_PRIVATIVAS.id_areas_privativas
- PAGOS.id_cat_grupos_cobro -> CAT_GRUPOS_COBRO.id_cat_grupos_cobro
- DIRECTORIO.id_roles_condominal -> ROLES_CONDOMINAL.id_roles_condominal
- CONVOCATORIAS.id_directorioConvoca -> DIRECTORIO.id_directorio
- CONVOCATORIAS.id_directorioModerador -> DIRECTORIO.id_directorio
- GASTOS.id_cat_conceptos_presupuesto -> CAT_CONCEPTOS_PRESUPUESTO.id_cat_conceptos_presupuesto

## 6) Anomalias y deuda tecnica prioritaria

Prioridad alta:
1. SQL concatenado con entrada de usuario.
2. Falta de capa de dominio/repositorio.
3. FK faltantes en columnas criticas financieras.
4. Artefactos de backup/fix en runtime.

Prioridad media:
1. Doble capa auth en raiz y cliente.
2. Repeticion de includes de bootstrap.
3. Convocatorias/tareas con baja consistencia de datos en snapshot.

Prioridad baja:
1. Tablas no relacionadas al dominio condominal (tours/artistas) coexistiendo en la misma BD.

## 7) Evidencia tecnica generada

Archivos raw (generados automaticamente):
- docs/raw-db/schema.sql
- docs/raw-db/full_dump.sql
- docs/raw-db/tables.txt
- docs/raw-db/columns.tsv
- docs/raw-db/indexes.tsv
- docs/raw-db/key_column_usage.tsv
- docs/raw-db/table_counts.tsv
- docs/raw-db/table_profile_with_counts.tsv
- docs/raw-db/id_columns_without_declared_fk.tsv
- docs/raw-code/sql_lines.txt
- docs/raw-code/sql_dynamic_samples.txt
- docs/raw-code/include_lines.txt
- docs/raw-code/repeated_sql_patterns.txt
- docs/raw-code/module_files_with_header.tsv
- docs/raw-code/module_tables.tsv
- docs/raw-code/module_operations.tsv
- docs/raw-code/obsolete_candidates.txt

## 8) Decision tecnica preliminar

La evidencia tecnica confirma una arquitectura de datos fuertemente relacional y transaccional. Por integridad financiera, historicos de cobro/pago y reporteria, la migracion objetivo recomendada es PostgreSQL con Prisma (detalle formal en postgres-vs-mongo.md).
