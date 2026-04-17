-- MySQL dump 10.13  Distrib 9.6.0, for macos26.2 (arm64)
--
-- Host: sistemasabanza.com    Database: sistemasabanza_insulaeValquirico
-- ------------------------------------------------------
-- Server version	5.7.44

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `AREAS_PRIVATIVAS`
--

DROP TABLE IF EXISTS `AREAS_PRIVATIVAS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AREAS_PRIVATIVAS` (
  `id_areas_privativas` int(11) NOT NULL AUTO_INCREMENT,
  `id_dcat_zonas` int(11) DEFAULT NULL,
  `id_dcat_subzonas` int(11) DEFAULT NULL,
  `id_areas_privativas_padre` int(11) DEFAULT '0' COMMENT 'es hijo de esta area privativa',
  `id_cat_status` int(11) NOT NULL DEFAULT '1',
  `nombre` varchar(100) NOT NULL,
  `iniciales` varchar(10) DEFAULT NULL,
  `m2_totales` decimal(10,4) NOT NULL DEFAULT '0.0000' COMMENT 'Ya incluyendo accesorios',
  `es_fusion` tinyint(4) NOT NULL DEFAULT '0' COMMENT '0=no, 1=s1',
  `indiviso` decimal(10,4) DEFAULT '0.0000',
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `direccion` text,
  `m2_construccion` decimal(10,4) DEFAULT NULL,
  `id_dcat_calles` int(11) DEFAULT NULL,
  `vcc` decimal(10,4) DEFAULT '0.0000',
  `indivisoParticular` int(11) DEFAULT NULL,
  `indivisoParticularMadruela` decimal(10,4) DEFAULT NULL,
  `m2_construccionHijos` decimal(10,4) DEFAULT NULL,
  `totalHijosApoles` int(11) NOT NULL DEFAULT '0',
  `id_areas_privativas_hijo` int(11) DEFAULT NULL COMMENT 'es parte de una fusion',
  `ordenamiento` int(11) NOT NULL DEFAULT '0',
  `m2_area_comun` float(10,4) NOT NULL DEFAULT '0.0000',
  `m2_areaComunHijos` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `saldoAFavor` decimal(30,2) NOT NULL DEFAULT '0.00',
  `m2Original` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `saldoAFavorComercio` decimal(30,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id_areas_privativas`),
  KEY `fk_AREAS_PRIVATIVAS_DCAT_ZONAS1_idx` (`id_dcat_zonas`),
  KEY `fk_AREAS_PRIVATIVAS_DCAT_SUBZONAS1_idx` (`id_dcat_subzonas`),
  KEY `fk_AREAS_PRIVATIVAS_AREAS_PRIVATIVAS1_idx` (`id_areas_privativas_padre`),
  KEY `fk_AREAS_PRIVATIVAS_CAT_STATUS1_idx` (`id_cat_status`)
) ENGINE=InnoDB AUTO_INCREMENT=1761 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AREAS_PRIVATIVAS_HAS_CUOTAS`
--

DROP TABLE IF EXISTS `AREAS_PRIVATIVAS_HAS_CUOTAS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AREAS_PRIVATIVAS_HAS_CUOTAS` (
  `id_areas_privativas_has_cuotas` int(11) NOT NULL AUTO_INCREMENT,
  `id_areas_privativas` int(11) NOT NULL,
  `id_cat_grupos_cobro` int(11) NOT NULL,
  `monto` decimal(30,2) NOT NULL DEFAULT '0.00',
  `anio` int(11) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_areas_privativas_has_cuotas`),
  KEY `area` (`id_areas_privativas`),
  KEY `id_dcat_uso_suelo` (`id_cat_grupos_cobro`),
  CONSTRAINT `AREAS_PRIVATIVAS_HAS_CUOTAS_ibfk_1` FOREIGN KEY (`id_areas_privativas`) REFERENCES `AREAS_PRIVATIVAS` (`id_areas_privativas`),
  CONSTRAINT `AREAS_PRIVATIVAS_HAS_CUOTAS_ibfk_2` FOREIGN KEY (`id_cat_grupos_cobro`) REFERENCES `CAT_GRUPOS_COBRO` (`id_cat_grupos_cobro`)
) ENGINE=InnoDB AUTO_INCREMENT=4865 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AREAS_PRIVATIVAS_HAS_DCAT_USO_SUELO`
--

DROP TABLE IF EXISTS `AREAS_PRIVATIVAS_HAS_DCAT_USO_SUELO`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AREAS_PRIVATIVAS_HAS_DCAT_USO_SUELO` (
  `id_areas_privativas_has_dcat_uso_suelo` int(11) NOT NULL AUTO_INCREMENT,
  `id_areas_privativas` int(11) NOT NULL,
  `id_dcat_uso_suelo` int(11) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_areas_privativas_has_dcat_uso_suelo`),
  KEY `fk_AREAS_PRIVATIVAS_has_DCAT_USO_SUELO_DCAT_USO_SUELO1_idx` (`id_dcat_uso_suelo`),
  KEY `fk_AREAS_PRIVATIVAS_has_DCAT_USO_SUELO_AREAS_PRIVATIVAS1_idx` (`id_areas_privativas`)
) ENGINE=InnoDB AUTO_INCREMENT=6521 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `AREAS_PRIVATIVAS_IMAGENES`
--

DROP TABLE IF EXISTS `AREAS_PRIVATIVAS_IMAGENES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AREAS_PRIVATIVAS_IMAGENES` (
  `id_areas_privativas_imagenes` int(11) NOT NULL AUTO_INCREMENT,
  `id_areas_privativas` int(11) NOT NULL,
  `pie` text,
  `archivo` varchar(50) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_areas_privativas_imagenes`),
  KEY `id_areas_privativas` (`id_areas_privativas`),
  CONSTRAINT `AREAS_PRIVATIVAS_IMAGENES_ibfk_1` FOREIGN KEY (`id_areas_privativas`) REFERENCES `AREAS_PRIVATIVAS` (`id_areas_privativas`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ARRENDAMIENTOS`
--

DROP TABLE IF EXISTS `ARRENDAMIENTOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ARRENDAMIENTOS` (
  `id_arrendamientos` int(11) NOT NULL AUTO_INCREMENT,
  `id_directorio_has_comercios` int(11) DEFAULT NULL,
  `nombre_comercio` varchar(100) DEFAULT NULL,
  `razon_social_comercio` varchar(100) DEFAULT NULL,
  `id_dcat_clases_comercios` int(11) DEFAULT NULL,
  `id_cat_status_comercios` int(11) DEFAULT NULL,
  `uso_marca` tinyint(1) DEFAULT '0',
  `observaciones` text,
  `fecha_inscripcion_f861` date DEFAULT NULL,
  `fecha_vigencia_f861` date DEFAULT NULL,
  `folio_861` varchar(100) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `id_areas_privativas` int(11) DEFAULT NULL,
  `fecha_inicio` date DEFAULT NULL,
  `id_dcat_giros0` int(11) DEFAULT NULL,
  `id_dcat_categorias_comercial0` int(11) DEFAULT NULL,
  `id_dcat_subcategorias_comercial0` int(11) DEFAULT NULL,
  `id_dcat_giros1` int(11) DEFAULT NULL,
  `id_dcat_categorias_comercial1` int(11) DEFAULT NULL,
  `id_dcat_subcategorias_comercial1` int(11) DEFAULT NULL,
  `id_dcat_giros2` int(11) DEFAULT NULL,
  `id_dcat_categorias_comercial2` int(11) DEFAULT NULL,
  `id_dcat_subcategorias_comercial2` int(11) DEFAULT NULL,
  `id_dcat_giros3` int(11) DEFAULT NULL,
  `id_dcat_categorias_comercial3` int(11) DEFAULT NULL,
  `id_dcat_subcategorias_comercial3` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_arrendamientos`),
  KEY `directorio` (`id_directorio_has_comercios`),
  KEY `clase` (`id_dcat_clases_comercios`),
  KEY `status` (`id_cat_status_comercios`),
  KEY `giro0` (`id_dcat_giros0`),
  KEY `categoria0` (`id_dcat_categorias_comercial0`),
  KEY `sub0` (`id_dcat_subcategorias_comercial0`),
  KEY `area` (`id_areas_privativas`),
  CONSTRAINT `ARRENDAMIENTOS_ibfk_1` FOREIGN KEY (`id_areas_privativas`) REFERENCES `AREAS_PRIVATIVAS` (`id_areas_privativas`)
) ENGINE=InnoDB AUTO_INCREMENT=573 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ASISTENCIAS_CONVOCATORIA`
--

DROP TABLE IF EXISTS `ASISTENCIAS_CONVOCATORIA`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ASISTENCIAS_CONVOCATORIA` (
  `id_asistencias_asamblea` int(11) NOT NULL AUTO_INCREMENT,
  `id` int(11) NOT NULL,
  `id_convocatorias_fechas` int(11) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `indivisoAsamblea` decimal(10,4) NOT NULL DEFAULT '0.0000',
  PRIMARY KEY (`id_asistencias_asamblea`),
  KEY `fk_ASISTENCIAS_CONVOCATORIA_AREAS_PRIVATIVAS1_idx` (`id`),
  KEY `fk_ASISTENCIAS_CONVOCATORIA_CONVOCATORIAS_FECHAS1_idx` (`id_convocatorias_fechas`),
  CONSTRAINT `fk_ASISTENCIAS_CONVOCATORIA_AREAS_PRIVATIVAS1` FOREIGN KEY (`id`) REFERENCES `AREAS_PRIVATIVAS` (`id_areas_privativas`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_ASISTENCIAS_CONVOCATORIA_CONVOCATORIAS_FECHAS1` FOREIGN KEY (`id_convocatorias_fechas`) REFERENCES `CONVOCATORIAS_FECHAS` (`id_convocatorias_fechas`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CAT_CONCEPTOS_PRESUPUESTO`
--

DROP TABLE IF EXISTS `CAT_CONCEPTOS_PRESUPUESTO`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CAT_CONCEPTOS_PRESUPUESTO` (
  `id_cat_conceptos_presupuesto` int(11) NOT NULL AUTO_INCREMENT,
  `id_cat_grupos_presupuesto` int(11) NOT NULL,
  `nombre` varchar(200) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `id_cat_tipos_concepto` int(11) NOT NULL DEFAULT '0',
  `anio` int(11) NOT NULL DEFAULT '2025',
  `orden` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_cat_conceptos_presupuesto`),
  KEY `grupo` (`id_cat_grupos_presupuesto`),
  KEY `idx_anio` (`anio`)
) ENGINE=InnoDB AUTO_INCREMENT=305 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CAT_CONCEPTOS_PRESUPUESTO_BACKUP_20260203`
--

DROP TABLE IF EXISTS `CAT_CONCEPTOS_PRESUPUESTO_BACKUP_20260203`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CAT_CONCEPTOS_PRESUPUESTO_BACKUP_20260203` (
  `id_cat_conceptos_presupuesto` int(11) NOT NULL DEFAULT '0',
  `id_cat_grupos_presupuesto` int(11) NOT NULL,
  `nombre` varchar(200) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `id_cat_tipos_concepto` int(11) NOT NULL DEFAULT '0',
  `orden` int(11) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CAT_FORMAS_PAGO`
--

DROP TABLE IF EXISTS `CAT_FORMAS_PAGO`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CAT_FORMAS_PAGO` (
  `id_cat_formas_pago` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(30) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_cat_formas_pago`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CAT_GRUPOS_COBRO`
--

DROP TABLE IF EXISTS `CAT_GRUPOS_COBRO`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CAT_GRUPOS_COBRO` (
  `id_cat_grupos_cobro` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `tiempo` int(11) NOT NULL COMMENT '1=menusal, 2=anual',
  `interes` decimal(10,2) NOT NULL,
  `adicional` tinyint(1) NOT NULL DEFAULT '0' COMMENT '0=no, 1= si es d otra tabla\r\n',
  `aplica_presupuesto` tinyint(1) NOT NULL DEFAULT '0' COMMENT '0=no, 1=si',
  `hijos` tinyint(1) NOT NULL DEFAULT '0' COMMENT '0=no, 1=si',
  `selecobra_padres` tinyint(1) NOT NULL DEFAULT '0' COMMENT '0=no, 1=si',
  `noCambiar_sad` tinyint(1) NOT NULL DEFAULT '0',
  `ordenamiento` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_cat_grupos_cobro`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CAT_GRUPOS_COBRO_HISTORICO`
--

DROP TABLE IF EXISTS `CAT_GRUPOS_COBRO_HISTORICO`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CAT_GRUPOS_COBRO_HISTORICO` (
  `id_cat_grupos_cobro_historico` int(11) NOT NULL AUTO_INCREMENT,
  `id_cat_grupos_cobro` int(11) NOT NULL,
  `anio` int(11) NOT NULL,
  `interes` decimal(10,2) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_cat_grupos_cobro_historico`),
  KEY `grupo` (`id_cat_grupos_cobro`),
  CONSTRAINT `grupo` FOREIGN KEY (`id_cat_grupos_cobro`) REFERENCES `CAT_GRUPOS_COBRO` (`id_cat_grupos_cobro`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CAT_GRUPOS_PRESUPUESTO`
--

DROP TABLE IF EXISTS `CAT_GRUPOS_PRESUPUESTO`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CAT_GRUPOS_PRESUPUESTO` (
  `id_cat_grupos_presupuesto` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `id_cat_grupos_presupuesto_padre` int(11) DEFAULT NULL,
  `css` varchar(15) DEFAULT NULL,
  `id_cat_grupos_cobro` int(11) DEFAULT NULL,
  `anio` int(11) NOT NULL DEFAULT '2025',
  PRIMARY KEY (`id_cat_grupos_presupuesto`),
  KEY `idx_anio` (`anio`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CAT_GRUPOS_PRESUPUESTO_BACKUP_20260203`
--

DROP TABLE IF EXISTS `CAT_GRUPOS_PRESUPUESTO_BACKUP_20260203`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CAT_GRUPOS_PRESUPUESTO_BACKUP_20260203` (
  `id_cat_grupos_presupuesto` int(11) NOT NULL DEFAULT '0',
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `id_cat_grupos_presupuesto_padre` int(11) DEFAULT NULL,
  `css` varchar(15) DEFAULT NULL,
  `id_cat_grupos_cobro` int(11) DEFAULT NULL,
  `anio` int(11) NOT NULL DEFAULT '2025'
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CAT_GRUPO_PUESTOS`
--

DROP TABLE IF EXISTS `CAT_GRUPO_PUESTOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CAT_GRUPO_PUESTOS` (
  `id_cat_grupo_puestos` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(200) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `posicion` int(11) DEFAULT NULL,
  `tipo` int(11) NOT NULL COMMENT '1=consejo, 2=comision,3=comite\r\n',
  PRIMARY KEY (`id_cat_grupo_puestos`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CAT_LLAMAR_A`
--

DROP TABLE IF EXISTS `CAT_LLAMAR_A`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CAT_LLAMAR_A` (
  `id_cat_llamar_a` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `tipoVoto` int(11) NOT NULL COMMENT '1=indivo, 2=vccc, 3=manita, 4=porcentajes\r\n',
  PRIMARY KEY (`id_cat_llamar_a`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CAT_MODULOS`
--

DROP TABLE IF EXISTS `CAT_MODULOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CAT_MODULOS` (
  `id_cat_modulos` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `es_especial` tinyint(4) NOT NULL DEFAULT '0',
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_cat_modulos`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CAT_PUESTOS`
--

DROP TABLE IF EXISTS `CAT_PUESTOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CAT_PUESTOS` (
  `id_cat_puestos` int(11) NOT NULL AUTO_INCREMENT,
  `id_cat_grupo_puestos` int(11) NOT NULL,
  `nombre` varchar(200) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `cantidad` int(11) NOT NULL DEFAULT '1',
  `suplente` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_cat_puestos`)
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CAT_SANCIONES`
--

DROP TABLE IF EXISTS `CAT_SANCIONES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CAT_SANCIONES` (
  `id_cat_sanciones` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(30) NOT NULL,
  `activo` int(11) NOT NULL DEFAULT '1',
  `id_cat_grupos_cobro` int(11) NOT NULL DEFAULT '5',
  `articulo` text,
  PRIMARY KEY (`id_cat_sanciones`),
  KEY `grupo` (`id_cat_grupos_cobro`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CAT_SUBTIPOS_CONVOCATORIAS`
--

DROP TABLE IF EXISTS `CAT_SUBTIPOS_CONVOCATORIAS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CAT_SUBTIPOS_CONVOCATORIAS` (
  `id_cat_subtipos_convocatorias` int(11) NOT NULL AUTO_INCREMENT,
  `id_cat_tipos_convocatoria` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `id_cat_llamar_a` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_cat_subtipos_convocatorias`),
  KEY `fk_CAT_SUBTIPOS_CONVOCATORIAS_CAT_TIPOS_CONVOCATORIAS1_idx` (`id_cat_tipos_convocatoria`),
  CONSTRAINT `fk_CAT_SUBTIPOS_CONVOCATORIAS_CAT_TIPOS_CONVOCATORIAS1` FOREIGN KEY (`id_cat_tipos_convocatoria`) REFERENCES `CAT_TIPOS_CONVOCATORIAS` (`id_cat_tipos_convocatoria`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CAT_TIPOS_CONCEPTO`
--

DROP TABLE IF EXISTS `CAT_TIPOS_CONCEPTO`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CAT_TIPOS_CONCEPTO` (
  `id_cat_tipos_concepto` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_cat_tipos_concepto`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CAT_TIPOS_CONVOCATORIAS`
--

DROP TABLE IF EXISTS `CAT_TIPOS_CONVOCATORIAS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CAT_TIPOS_CONVOCATORIAS` (
  `id_cat_tipos_convocatoria` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_cat_tipos_convocatoria`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CAT_TIPOS_NOTIFICACIONES`
--

DROP TABLE IF EXISTS `CAT_TIPOS_NOTIFICACIONES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CAT_TIPOS_NOTIFICACIONES` (
  `id_cat_tipos_notificaciones` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(45) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `fijo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_cat_tipos_notificaciones`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CAT_TIPOS_TEMAS`
--

DROP TABLE IF EXISTS `CAT_TIPOS_TEMAS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CAT_TIPOS_TEMAS` (
  `idcat_tipos_temas` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`idcat_tipos_temas`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CONTACTOS`
--

DROP TABLE IF EXISTS `CONTACTOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CONTACTOS` (
  `id_contactos` int(11) NOT NULL AUTO_INCREMENT,
  `id_cat_tipos_contacto` int(11) NOT NULL,
  `nombre` varchar(200) NOT NULL,
  `dato` varchar(200) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `enlace` text,
  `target` varchar(20) DEFAULT '_self',
  `orden` int(11) NOT NULL DEFAULT '0',
  `principal` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_contactos`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CONVOCADOS`
--

DROP TABLE IF EXISTS `CONVOCADOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CONVOCADOS` (
  `id_convocados` int(11) NOT NULL AUTO_INCREMENT,
  `id_convocatorias` int(11) NOT NULL,
  `id` int(11) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `id_cat_llamar_a` int(11) NOT NULL,
  `porcentaje` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_convocados`),
  KEY `fk_CONVOCADOS_CONVOCATORIAS2_idx` (`id_convocatorias`),
  CONSTRAINT `fk_CONVOCADOS_CONVOCATORIAS2` FOREIGN KEY (`id_convocatorias`) REFERENCES `CONVOCATORIAS` (`id_convocatorias`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CONVOCATORIAS`
--

DROP TABLE IF EXISTS `CONVOCATORIAS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CONVOCATORIAS` (
  `id_convocatorias` int(11) NOT NULL AUTO_INCREMENT,
  `id_cat_tipos_convocatoria` int(11) NOT NULL,
  `id_cat_subtipos_convocatorias` int(11) NOT NULL,
  `id_cat_status_convocatoria` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `comentarios` text,
  `invitados` text,
  `total_esperado` int(11) NOT NULL DEFAULT '0',
  `total_asistencia` int(11) NOT NULL DEFAULT '0',
  `indiviso_asistencia` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `pdf` varchar(30) DEFAULT NULL,
  `puestoConvoca` varchar(200) DEFAULT NULL,
  `id_directorioConvoca` int(11) DEFAULT NULL,
  `puestoModerador` varchar(200) DEFAULT NULL,
  `id_directorioModerador` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_convocatorias`),
  KEY `fk_CONVOCATORIAS_CAT_SUBTIPOS_CONVOCATORIAS1_idx` (`id_cat_subtipos_convocatorias`),
  KEY `fk_CONVOCATORIAS_CAT_TIPOS_CONVOCATORIAS1_idx` (`id_cat_tipos_convocatoria`),
  KEY `fk_CONVOCATORIAS_CAT_STATUS_CONVOCATORIA1_idx` (`id_cat_status_convocatoria`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CONVOCATORIAS_FECHAS`
--

DROP TABLE IF EXISTS `CONVOCATORIAS_FECHAS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CONVOCATORIAS_FECHAS` (
  `id_convocatorias_fechas` int(11) NOT NULL AUTO_INCREMENT,
  `id_convocatorias` int(11) NOT NULL,
  `id_dcat_tipos_fechas_convocatorias` int(11) NOT NULL,
  `id_cat_status_convocatorias_fechas` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  `lugar` varchar(100) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_convocatorias_fechas`),
  KEY `fk_CONVOCATORIAS_FECHAS_CONVOCATORIAS1_idx` (`id_convocatorias`),
  KEY `fk_CONVOCATORIAS_FECHAS_DCAT_TIPOS_FECHAS_CONVOCATORIAS1_idx` (`id_dcat_tipos_fechas_convocatorias`),
  KEY `fk_CONVOCATORIAS_FECHAS_CAT_STATUS_CONVOCATORIA1_idx` (`id_cat_status_convocatorias_fechas`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CONVOCATORIAS_HAS_INVITADOS_ESPECIALES`
--

DROP TABLE IF EXISTS `CONVOCATORIAS_HAS_INVITADOS_ESPECIALES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CONVOCATORIAS_HAS_INVITADOS_ESPECIALES` (
  `id_convocatorias_has_invitados_especiales` int(11) NOT NULL AUTO_INCREMENT,
  `id_convocatorias` int(11) NOT NULL,
  `id_invitados_especiales` int(11) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_convocatorias_has_invitados_especiales`),
  KEY `fk_CONVOCATORIAS_has_INVITADOS_ESPECIALES_INVITADOS_ESPECIA_idx` (`id_invitados_especiales`),
  KEY `fk_CONVOCATORIAS_has_INVITADOS_ESPECIALES_CONVOCATORIAS1_idx` (`id_convocatorias`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CONVOCATORIAS_INVITADOS`
--

DROP TABLE IF EXISTS `CONVOCATORIAS_INVITADOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CONVOCATORIAS_INVITADOS` (
  `id_convocatorias_invitados` int(11) NOT NULL AUTO_INCREMENT,
  `id_convocatorias` int(11) NOT NULL,
  `id_cat_puestos` int(11) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_convocatorias_invitados`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `CUPONES_TOUR`
--

DROP TABLE IF EXISTS `CUPONES_TOUR`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CUPONES_TOUR` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_lugar` int(11) NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `descripcion` text,
  `vigencia` date NOT NULL,
  `es_exclusivo_tour` tinyint(1) DEFAULT '1',
  `activo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cupones_tour_lugar` (`id_lugar`),
  KEY `idx_cupones_tour_vigencia` (`vigencia`),
  KEY `idx_cupones_tour_exclusivo` (`es_exclusivo_tour`),
  KEY `idx_cupones_tour_activo` (`activo`),
  CONSTRAINT `CUPONES_TOUR_ibfk_1` FOREIGN KEY (`id_lugar`) REFERENCES `DIRECTORIO` (`id_directorio`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='Tabla que maneja cupones/promociones exclusivas para tours';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DCAT_CALLES`
--

DROP TABLE IF EXISTS `DCAT_CALLES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DCAT_CALLES` (
  `id_dcat_calles` int(11) NOT NULL AUTO_INCREMENT,
  `id_dcat_zonas` int(11) NOT NULL,
  `nombre` varchar(200) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_dcat_calles`)
) ENGINE=InnoDB AUTO_INCREMENT=83 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DCAT_CATEGORIAS_COMERCIAL`
--

DROP TABLE IF EXISTS `DCAT_CATEGORIAS_COMERCIAL`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DCAT_CATEGORIAS_COMERCIAL` (
  `id_dcat_categorias_comercial` int(11) NOT NULL AUTO_INCREMENT,
  `id_dcat_giros` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `clave` varchar(100) NOT NULL,
  PRIMARY KEY (`id_dcat_categorias_comercial`),
  KEY `fk_DCAT_CATEGORIAS_COMERCIAL_CAT_TIPOS_INGRESOS_EGRESOS1_idx` (`id_dcat_giros`),
  CONSTRAINT `fk_DCAT_CATEGORIAS_COMERCIAL_CAT_TIPOS_INGRESOS_EGRESOS1` FOREIGN KEY (`id_dcat_giros`) REFERENCES `DCAT_GIROS` (`id_dcat_giros`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DCAT_CATEGORIAS_GASTOS`
--

DROP TABLE IF EXISTS `DCAT_CATEGORIAS_GASTOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DCAT_CATEGORIAS_GASTOS` (
  `id_dcat_categorias_gastos` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_dcat_categorias_gastos`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DCAT_CATEGORIAS_NOTIFICACIONES`
--

DROP TABLE IF EXISTS `DCAT_CATEGORIAS_NOTIFICACIONES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DCAT_CATEGORIAS_NOTIFICACIONES` (
  `id_dcat_categorias_notificaciones` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(60) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `sad` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_dcat_categorias_notificaciones`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DCAT_CLASES_COMERCIOS`
--

DROP TABLE IF EXISTS `DCAT_CLASES_COMERCIOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DCAT_CLASES_COMERCIOS` (
  `id_dcat_clases_comercios` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_dcat_clases_comercios`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DCAT_GIROS`
--

DROP TABLE IF EXISTS `DCAT_GIROS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DCAT_GIROS` (
  `id_dcat_giros` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `id_proyectos` int(11) NOT NULL,
  `clave` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id_dcat_giros`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DCAT_SUBCATEGORIAS_COMERCIAL`
--

DROP TABLE IF EXISTS `DCAT_SUBCATEGORIAS_COMERCIAL`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DCAT_SUBCATEGORIAS_COMERCIAL` (
  `id_dcat_subcategorias_comercial` int(11) NOT NULL AUTO_INCREMENT,
  `id_dcat_categorias_comercial` int(11) NOT NULL,
  `id_dcat_giros` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `clave` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id_dcat_subcategorias_comercial`),
  KEY `fk_DCAT_SUBCATEGORIAS_COMERCIAL_DCAT_CATEGORIAS_COMERCIAL1_idx` (`id_dcat_categorias_comercial`),
  KEY `fk_DCAT_SUBCATEGORIAS_COMERCIAL_DCAT_GIROS1_idx` (`id_dcat_giros`),
  CONSTRAINT `fk_DCAT_SUBCATEGORIAS_COMERCIAL_DCAT_CATEGORIAS_COMERCIAL1` FOREIGN KEY (`id_dcat_categorias_comercial`) REFERENCES `DCAT_CATEGORIAS_COMERCIAL` (`id_dcat_categorias_comercial`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_DCAT_SUBCATEGORIAS_COMERCIAL_DCAT_GIROS1` FOREIGN KEY (`id_dcat_giros`) REFERENCES `DCAT_GIROS` (`id_dcat_giros`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=180 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DCAT_SUBZONAS`
--

DROP TABLE IF EXISTS `DCAT_SUBZONAS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DCAT_SUBZONAS` (
  `id_dcat_subzonas` int(11) NOT NULL AUTO_INCREMENT,
  `id_dcat_zonas` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `iniciales` varchar(5) DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_dcat_subzonas`),
  KEY `fk_DCAT_SUBZONAS_DCAT_ZONAS1_idx` (`id_dcat_zonas`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DCAT_TIPOS_FECHAS_CONVOCATORIAS`
--

DROP TABLE IF EXISTS `DCAT_TIPOS_FECHAS_CONVOCATORIAS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DCAT_TIPOS_FECHAS_CONVOCATORIAS` (
  `id_dcat_tipos_fechas_convocatorias` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `porcentaje` decimal(10,4) NOT NULL DEFAULT '0.0000',
  PRIMARY KEY (`id_dcat_tipos_fechas_convocatorias`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DCAT_USO_SUELO`
--

DROP TABLE IF EXISTS `DCAT_USO_SUELO`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DCAT_USO_SUELO` (
  `id_dcat_uso_suelo` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(200) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `iniciales` varchar(10) NOT NULL,
  `sol_sombra` int(11) NOT NULL DEFAULT '0' COMMENT '0=sol, 1=sombra, 2=N/A, 3=SERVICIOS ESPECIALES',
  `ponderador` decimal(10,2) NOT NULL DEFAULT '0.00',
  `porcentaje` decimal(30,4) NOT NULL DEFAULT '0.0000',
  `orden` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_dcat_uso_suelo`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DCAT_USO_SUELO_HISTORICO`
--

DROP TABLE IF EXISTS `DCAT_USO_SUELO_HISTORICO`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DCAT_USO_SUELO_HISTORICO` (
  `id_dcat_uso_suelo_historico` int(11) NOT NULL AUTO_INCREMENT,
  `id_dcat_uso_suelo` int(11) NOT NULL,
  `anio` int(11) NOT NULL,
  `monto` decimal(10,2) NOT NULL DEFAULT '0.00',
  `id_cat_grupos_cobro` int(11) NOT NULL,
  `formaAplicacion` tinyint(1) NOT NULL DEFAULT '0' COMMENT '0=unico, 1=metraje',
  PRIMARY KEY (`id_dcat_uso_suelo_historico`)
) ENGINE=InnoDB AUTO_INCREMENT=187 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DCAT_VARIOS`
--

DROP TABLE IF EXISTS `DCAT_VARIOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DCAT_VARIOS` (
  `id_dcat_varios` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `id_cat_grupos_cobro` int(11) NOT NULL DEFAULT '2',
  PRIMARY KEY (`id_dcat_varios`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DCAT_ZONAS`
--

DROP TABLE IF EXISTS `DCAT_ZONAS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DCAT_ZONAS` (
  `id_dcat_zonas` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `iniciales` varchar(5) DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `id_proyectos` int(11) NOT NULL DEFAULT '1',
  `ponderador` decimal(10,2) NOT NULL DEFAULT '0.00',
  `valor_mkt` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id_dcat_zonas`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DIRECTORIO`
--

DROP TABLE IF EXISTS `DIRECTORIO`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DIRECTORIO` (
  `id_directorio` int(11) NOT NULL AUTO_INCREMENT,
  `id_cat_tipos_directorio` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `apaterno` varchar(100) DEFAULT NULL,
  `amaterno` varchar(100) DEFAULT NULL,
  `user` varchar(50) DEFAULT NULL,
  `pass` varchar(150) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `direccion` text,
  `passProvisional` varchar(150) DEFAULT NULL,
  `fechaProvissional` date DEFAULT NULL,
  `curp` varchar(45) DEFAULT NULL,
  `razon_social` varchar(200) DEFAULT NULL,
  `rfc` varchar(45) DEFAULT NULL,
  `direccion_fiscal` text,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `nombre_comercial` varchar(150) DEFAULT NULL,
  `email_fiscal` varchar(150) DEFAULT NULL,
  `telefono_comercial` varchar(100) DEFAULT NULL,
  `id_roles_condominal` int(11) NOT NULL DEFAULT '2',
  `aceptoAvisoPrivacidad` tinyint(1) NOT NULL DEFAULT '0',
  `fechaAceptoAvisoPrivacidad` datetime DEFAULT NULL,
  `requiereFactura` tinyint(1) NOT NULL DEFAULT '0' COMMENT '0=no, 1= si',
  `constanciaFiscal` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id_directorio`),
  KEY `fk_DIRECTORIO_CAT_TIPOS_DIRECTORIO1_idx` (`id_cat_tipos_directorio`),
  KEY `rol` (`id_roles_condominal`),
  CONSTRAINT `DIRECTORIO_ibfk_1` FOREIGN KEY (`id_roles_condominal`) REFERENCES `ROLES_CONDOMINAL` (`id_roles_condominal`)
) ENGINE=InnoDB AUTO_INCREMENT=853 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DIRECTORIO_HAS_ASIGNACIONES`
--

DROP TABLE IF EXISTS `DIRECTORIO_HAS_ASIGNACIONES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DIRECTORIO_HAS_ASIGNACIONES` (
  `id_directorio_has_asignaciones` int(11) NOT NULL AUTO_INCREMENT,
  `id_directorio` int(11) NOT NULL,
  `id_roles_condominal` int(11) NOT NULL,
  `id` int(11) DEFAULT NULL,
  `porcentaje` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_directorio_has_asignaciones`),
  KEY `fk_DIRECTORIO_HAS_ASIGNACIONES_DIRECTORIO1_idx` (`id_directorio`),
  KEY `fk_DIRECTORIO_HAS_ASIGNACIONES_ENTIDADES1_idx` (`id_roles_condominal`)
) ENGINE=InnoDB AUTO_INCREMENT=5778 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DIRECTORIO_HAS_CAT_PUESTOS`
--

DROP TABLE IF EXISTS `DIRECTORIO_HAS_CAT_PUESTOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DIRECTORIO_HAS_CAT_PUESTOS` (
  `id_directorio_has_cat_puestos` int(11) NOT NULL AUTO_INCREMENT,
  `id_directorio` int(11) NOT NULL,
  `id_cat_puestos` int(11) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `suplente` tinyint(1) NOT NULL DEFAULT '0' COMMENT '0=no, 1=si',
  PRIMARY KEY (`id_directorio_has_cat_puestos`)
) ENGINE=InnoDB AUTO_INCREMENT=258 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DIRECTORIO_HAS_COMERCIOS`
--

DROP TABLE IF EXISTS `DIRECTORIO_HAS_COMERCIOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DIRECTORIO_HAS_COMERCIOS` (
  `id_directorio_has_comercios` int(11) NOT NULL AUTO_INCREMENT,
  `id_directorio` int(11) NOT NULL,
  `nombre` varchar(200) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `telefono` varchar(30) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `razonSocial` varchar(200) DEFAULT NULL,
  `rfc` varchar(30) DEFAULT NULL,
  `id_directorioAdministrativo` int(11) DEFAULT NULL,
  `id_directorioContable` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_directorio_has_comercios`),
  KEY `directorio` (`id_directorio`),
  CONSTRAINT `directorio` FOREIGN KEY (`id_directorio`) REFERENCES `DIRECTORIO` (`id_directorio`)
) ENGINE=InnoDB AUTO_INCREMENT=300 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `GASTOS`
--

DROP TABLE IF EXISTS `GASTOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `GASTOS` (
  `id_gastos` int(11) NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `monto` decimal(30,2) NOT NULL,
  `comentarios` text NOT NULL,
  `comprobante` varchar(50) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `id_cat_conceptos_presupuesto` int(11) DEFAULT NULL,
  `id_cat_formas_pago` int(11) NOT NULL DEFAULT '1',
  `recibo` varchar(50) DEFAULT NULL,
  `proyecto` text,
  PRIMARY KEY (`id_gastos`),
  KEY `cate` (`id_cat_conceptos_presupuesto`)
) ENGINE=InnoDB AUTO_INCREMENT=1259 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `HISTORICO_PAGOS`
--

DROP TABLE IF EXISTS `HISTORICO_PAGOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `HISTORICO_PAGOS` (
  `id_historico_pagos` int(11) NOT NULL AUTO_INCREMENT,
  `fechaPago` date NOT NULL,
  `monto` decimal(30,2) DEFAULT NULL,
  `id_cat_status_historico_pagos` int(11) NOT NULL,
  `id_directorio` int(11) NOT NULL,
  `id_areas_privativas` int(11) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `folio` varchar(50) NOT NULL,
  `id_cat_formas_pago` int(11) NOT NULL,
  `comprobante` varchar(30) DEFAULT NULL,
  `saldoAFavor` decimal(30,2) NOT NULL DEFAULT '0.00',
  `aplicacionSaldoAFavor` tinyint(1) NOT NULL DEFAULT '0' COMMENT '0=no, 1=si',
  `comentarios` text NOT NULL,
  `id_opcion_estado_cuenta` int(11) NOT NULL DEFAULT '1',
  `id_arrendamientos` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_historico_pagos`),
  KEY `directorio` (`id_directorio`),
  KEY `status` (`id_cat_status_historico_pagos`),
  KEY `areaprivativa` (`id_areas_privativas`),
  KEY `forma` (`id_cat_formas_pago`),
  CONSTRAINT `HISTORICO_PAGOS_ibfk_1` FOREIGN KEY (`id_areas_privativas`) REFERENCES `AREAS_PRIVATIVAS` (`id_areas_privativas`),
  CONSTRAINT `HISTORICO_PAGOS_ibfk_2` FOREIGN KEY (`id_cat_formas_pago`) REFERENCES `CAT_FORMAS_PAGO` (`id_cat_formas_pago`),
  CONSTRAINT `HISTORICO_PAGOS_ibfk_3` FOREIGN KEY (`id_directorio`) REFERENCES `DIRECTORIO` (`id_directorio`)
) ENGINE=InnoDB AUTO_INCREMENT=3651 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `HISTORICO_PAGOS_DETALLE`
--

DROP TABLE IF EXISTS `HISTORICO_PAGOS_DETALLE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `HISTORICO_PAGOS_DETALLE` (
  `id_historico_pagos_detalle` int(11) NOT NULL AUTO_INCREMENT,
  `id_historico_pagos` int(11) NOT NULL,
  `monto` decimal(30,2) NOT NULL DEFAULT '0.00',
  `id_cat_grupos_cobro` int(11) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `saldoAFavor` decimal(30,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id_historico_pagos_detalle`)
) ENGINE=InnoDB AUTO_INCREMENT=3663 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `HISTORICO_PAGOS_HAS_PAGOS`
--

DROP TABLE IF EXISTS `HISTORICO_PAGOS_HAS_PAGOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `HISTORICO_PAGOS_HAS_PAGOS` (
  `id_historico_Pagos_has_pagos` int(11) NOT NULL AUTO_INCREMENT,
  `id_historico_pagos` int(11) NOT NULL,
  `id_historico_pagos_detalle` int(11) NOT NULL,
  `id_pagos` int(11) NOT NULL,
  `monto` decimal(30,2) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `parcialidad` tinyint(1) NOT NULL COMMENT '0=parcial, 1=completo',
  PRIMARY KEY (`id_historico_Pagos_has_pagos`),
  KEY `historico` (`id_historico_pagos`),
  KEY `pagos` (`id_pagos`),
  CONSTRAINT `HISTORICO_PAGOS_HAS_PAGOS_ibfk_1` FOREIGN KEY (`id_historico_pagos`) REFERENCES `HISTORICO_PAGOS` (`id_historico_pagos`),
  CONSTRAINT `HISTORICO_PAGOS_HAS_PAGOS_ibfk_2` FOREIGN KEY (`id_pagos`) REFERENCES `PAGOS` (`id_pagos`)
) ENGINE=InnoDB AUTO_INCREMENT=10265 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `INGRESOS`
--

DROP TABLE IF EXISTS `INGRESOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `INGRESOS` (
  `id_ingresos` int(11) NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `monto` decimal(30,2) NOT NULL DEFAULT '0.00',
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `id_cat_formas_pago` int(11) NOT NULL,
  `comprobante` varchar(30) DEFAULT NULL,
  `comentarios` text NOT NULL,
  `id_dcat_varios` int(11) DEFAULT NULL,
  `id_cat_grupos_cobro` int(11) DEFAULT NULL,
  `id_areas_privativas` int(11) DEFAULT NULL,
  `confirmado` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_ingresos`),
  KEY `forma` (`id_cat_formas_pago`),
  KEY `vario` (`id_dcat_varios`),
  KEY `idx_ingresos_area_privativa` (`id_areas_privativas`),
  KEY `idx_ingresos_confirmado` (`confirmado`),
  KEY `idx_ingresos_tipo_cuota` (`id_cat_grupos_cobro`),
  CONSTRAINT `INGRESOS_ibfk_1` FOREIGN KEY (`id_cat_formas_pago`) REFERENCES `CAT_FORMAS_PAGO` (`id_cat_formas_pago`),
  CONSTRAINT `fk_ingresos_areas_privativas` FOREIGN KEY (`id_areas_privativas`) REFERENCES `AREAS_PRIVATIVAS` (`id_areas_privativas`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ingresos_cat_grupos_cobro` FOREIGN KEY (`id_cat_grupos_cobro`) REFERENCES `CAT_GRUPOS_COBRO` (`id_cat_grupos_cobro`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=121 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `INVITADOS_ESPECIALES`
--

DROP TABLE IF EXISTS `INVITADOS_ESPECIALES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `INVITADOS_ESPECIALES` (
  `id_invitados_especiales` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `telefono` varchar(45) DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_invitados_especiales`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `NOTIFICACIONES`
--

DROP TABLE IF EXISTS `NOTIFICACIONES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NOTIFICACIONES` (
  `id_notificaciones` int(11) NOT NULL AUTO_INCREMENT,
  `id_cat_tipos_notificaciones` int(11) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `descripcion` text NOT NULL,
  `pdf` varchar(45) DEFAULT NULL,
  `imagen` varchar(45) DEFAULT NULL,
  `fechaPublicar` date NOT NULL,
  `fechaAlta` datetime NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `id_directorio` int(11) NOT NULL,
  `id_dcat_categorias_notificaciones` int(11) NOT NULL,
  `fechaVigencia` date DEFAULT NULL,
  PRIMARY KEY (`id_notificaciones`),
  KEY `fk_NOTIFICACIONES_CAT_TIPOS_NOTIFICACIONES_idx` (`id_cat_tipos_notificaciones`),
  KEY `fk_NOTIFICACIONES_DIRECTORIO1_idx` (`id_directorio`),
  KEY `fk_NOTIFICACIONES_DCAT_CATEGORIAS_NOTIFICACIONES1_idx` (`id_dcat_categorias_notificaciones`),
  CONSTRAINT `fk_NOTIFICACIONES_CAT_TIPOS_NOTIFICACIONES` FOREIGN KEY (`id_cat_tipos_notificaciones`) REFERENCES `CAT_TIPOS_NOTIFICACIONES` (`id_cat_tipos_notificaciones`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_NOTIFICACIONES_DCAT_CATEGORIAS_NOTIFICACIONES1` FOREIGN KEY (`id_dcat_categorias_notificaciones`) REFERENCES `DCAT_CATEGORIAS_NOTIFICACIONES` (`id_dcat_categorias_notificaciones`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_NOTIFICACIONES_DIRECTORIO1` FOREIGN KEY (`id_directorio`) REFERENCES `DIRECTORIO` (`id_directorio`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PAGOS`
--

DROP TABLE IF EXISTS `PAGOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PAGOS` (
  `id_pagos` int(11) NOT NULL AUTO_INCREMENT,
  `monto` decimal(30,2) NOT NULL,
  `fechaPago` date NOT NULL,
  `montoAbonado` decimal(30,2) NOT NULL DEFAULT '0.00',
  `id_opcion_estado_cuenta` int(11) NOT NULL DEFAULT '1' COMMENT '1= arrendatario, 2=propietario',
  `id_arrendamientos` int(11) DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `id_cat_grupos_cobro` int(11) NOT NULL,
  `concepto` varchar(300) NOT NULL,
  `id_areas_privativas` int(11) NOT NULL,
  `id_cat_status_pago` int(11) NOT NULL,
  `fechaLiquidacion` date DEFAULT NULL,
  `comentarios` text,
  `fechaAlta` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fechaVigencia` date DEFAULT NULL,
  `id_cat_sanciones` int(11) DEFAULT NULL,
  `intereses` decimal(30,2) NOT NULL DEFAULT '0.00',
  `ultimaActualizacionCron` datetime DEFAULT NULL,
  `descuento_aplicado` decimal(30,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id_pagos`),
  KEY `areaPrivativa` (`id_pagos`),
  KEY `id_areas_privativas` (`id_areas_privativas`),
  CONSTRAINT `PAGOS_ibfk_1` FOREIGN KEY (`id_areas_privativas`) REFERENCES `AREAS_PRIVATIVAS` (`id_areas_privativas`)
) ENGINE=InnoDB AUTO_INCREMENT=46904 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PASSWORD_RESET_TOKENS`
--

DROP TABLE IF EXISTS `PASSWORD_RESET_TOKENS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PASSWORD_RESET_TOKENS` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_directorio` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` timestamp NULL DEFAULT NULL,
  `used` tinyint(1) DEFAULT '0',
  `used_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_token` (`token`),
  KEY `idx_email` (`email`),
  KEY `idx_directorio` (`id_directorio`),
  CONSTRAINT `PASSWORD_RESET_TOKENS_ibfk_1` FOREIGN KEY (`id_directorio`) REFERENCES `DIRECTORIO` (`id_directorio`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PRESUPUESTO`
--

DROP TABLE IF EXISTS `PRESUPUESTO`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PRESUPUESTO` (
  `id_presupuesto` int(11) NOT NULL AUTO_INCREMENT,
  `anio` int(11) NOT NULL,
  `id_cat_status_presupuesto` int(11) NOT NULL,
  `documento` varchar(100) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fondoReserva` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_presupuesto`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PRESUPUESTO_DETALLE`
--

DROP TABLE IF EXISTS `PRESUPUESTO_DETALLE`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PRESUPUESTO_DETALLE` (
  `id_presupuesto_detalle` int(11) NOT NULL AUTO_INCREMENT,
  `anio` int(11) NOT NULL,
  `id_cat_conceptos_presupuesto` int(11) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `id_cat_grupos_presupuesto` int(11) NOT NULL,
  `id_presupuesto` int(11) NOT NULL,
  PRIMARY KEY (`id_presupuesto_detalle`),
  KEY `concepto` (`id_cat_conceptos_presupuesto`),
  KEY `grupo` (`id_cat_grupos_presupuesto`),
  CONSTRAINT `PRESUPUESTO_DETALLE_ibfk_1` FOREIGN KEY (`id_cat_conceptos_presupuesto`) REFERENCES `CAT_CONCEPTOS_PRESUPUESTO` (`id_cat_conceptos_presupuesto`),
  CONSTRAINT `PRESUPUESTO_DETALLE_ibfk_2` FOREIGN KEY (`id_cat_grupos_presupuesto`) REFERENCES `CAT_GRUPOS_PRESUPUESTO` (`id_cat_grupos_presupuesto`)
) ENGINE=InnoDB AUTO_INCREMENT=245 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PRESUPUESTO_MES`
--

DROP TABLE IF EXISTS `PRESUPUESTO_MES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PRESUPUESTO_MES` (
  `id_presupuesto_mes` int(11) NOT NULL AUTO_INCREMENT,
  `mes` int(11) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `gastoReal` decimal(30,2) NOT NULL DEFAULT '0.00',
  `id_presupuesto_detalle` int(11) NOT NULL,
  `costoMensual` decimal(30,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id_presupuesto_mes`)
) ENGINE=InnoDB AUTO_INCREMENT=2929 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PRESUPUESTO_MES_CERRADO`
--

DROP TABLE IF EXISTS `PRESUPUESTO_MES_CERRADO`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PRESUPUESTO_MES_CERRADO` (
  `id_presupuesto_mes_cerrado` int(11) NOT NULL AUTO_INCREMENT,
  `mes` int(11) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `fechaAlta` datetime DEFAULT CURRENT_TIMESTAMP,
  `id_presupuesto` int(11) NOT NULL,
  PRIMARY KEY (`id_presupuesto_mes_cerrado`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PROYECTOS`
--

DROP TABLE IF EXISTS `PROYECTOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PROYECTOS` (
  `id_proyectos` int(11) NOT NULL AUTO_INCREMENT,
  `id_cat_estados` int(11) NOT NULL,
  `id_cat_municipios` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `iniciales` varchar(5) DEFAULT NULL,
  `imagen_sad` varchar(45) DEFAULT NULL,
  `logo` varchar(45) DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `id_cat_formas_proyectos` int(11) NOT NULL,
  `id_cat_tipos_proyectos` int(11) NOT NULL,
  `totalM2` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `totalApoles` int(11) NOT NULL DEFAULT '0',
  `totalHijosM2` decimal(10,4) NOT NULL,
  `totalHijosApoles` int(11) NOT NULL,
  `areasComunes` decimal(10,4) NOT NULL,
  `valor_mkt_general` decimal(10,2) NOT NULL DEFAULT '0.00',
  `formulasUsodeSuelo` tinyint(1) NOT NULL DEFAULT '0' COMMENT '0=no, 1=si',
  `imagen_pie` varchar(50) DEFAULT NULL,
  `anioArranque` int(11) NOT NULL DEFAULT '0',
  `manejovccc` tinyint(1) NOT NULL DEFAULT '0' COMMENT '0=no, 1=si',
  `pie_izquierda` text,
  `pie_derecha` text,
  `pie_desarrollado` text,
  `aviso_privacidad` text,
  `correoEnvio` varchar(50) DEFAULT NULL,
  `clave` varchar(50) DEFAULT NULL,
  `claveSecreta` varchar(50) DEFAULT NULL,
  `link_gaceta` text,
  `tituloGaceta` text,
  `sintesisAviso` text,
  `pdfAviso` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id_proyectos`),
  KEY `fk_PROYECTOS_CAT_MUNICIPIOS1_idx` (`id_cat_municipios`),
  KEY `fk_PROYECTOS_CAT_ESTADOS1_idx` (`id_cat_estados`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PROYECTOS_DOCUMENTOS`
--

DROP TABLE IF EXISTS `PROYECTOS_DOCUMENTOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PROYECTOS_DOCUMENTOS` (
  `id_proyectos_documentos` int(11) NOT NULL AUTO_INCREMENT,
  `id_proyectos` int(11) NOT NULL,
  `nombre` varchar(300) NOT NULL,
  `archivo` varchar(100) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `id_cat_tipos_documento` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_proyectos_documentos`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `PROYECTOS_FOLIO`
--

DROP TABLE IF EXISTS `PROYECTOS_FOLIO`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `PROYECTOS_FOLIO` (
  `id_proyectos_folio` int(11) NOT NULL AUTO_INCREMENT,
  `anio` int(11) NOT NULL,
  `folio` int(11) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_proyectos_folio`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `REGISTROS_VISITANTES`
--

DROP TABLE IF EXISTS `REGISTROS_VISITANTES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `REGISTROS_VISITANTES` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_tour` int(11) NOT NULL,
  `nombre_adulto` varchar(255) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `num_menores` int(11) DEFAULT '0',
  `hash_unico` varchar(64) NOT NULL,
  `validado` tinyint(1) DEFAULT '0',
  `fecha_validacion` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_hash` (`hash_unico`),
  KEY `idx_registros_visitantes_tour` (`id_tour`),
  KEY `idx_registros_visitantes_hash` (`hash_unico`),
  KEY `idx_registros_visitantes_validado` (`validado`),
  CONSTRAINT `REGISTROS_VISITANTES_ibfk_1` FOREIGN KEY (`id_tour`) REFERENCES `TOURS` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='Tabla que maneja los registros de visitantes para tours';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `RESUMEN_FINANCIERO`
--

DROP TABLE IF EXISTS `RESUMEN_FINANCIERO`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RESUMEN_FINANCIERO` (
  `id_resumen_financiero` int(11) NOT NULL AUTO_INCREMENT,
  `anio` int(11) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `id_presupuesto` int(11) NOT NULL,
  PRIMARY KEY (`id_resumen_financiero`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `RESUMEN_FINANCIERO_MES`
--

DROP TABLE IF EXISTS `RESUMEN_FINANCIERO_MES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RESUMEN_FINANCIERO_MES` (
  `id_resumen_financiero_mes` int(11) NOT NULL AUTO_INCREMENT,
  `id_resumen_financiero` int(11) NOT NULL,
  `patrocinadores` decimal(30,2) NOT NULL DEFAULT '0.00',
  `comisionesBancarias` decimal(30,2) NOT NULL DEFAULT '0.00',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `mes` int(11) NOT NULL,
  PRIMARY KEY (`id_resumen_financiero_mes`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ROLES_CONDOMINAL`
--

DROP TABLE IF EXISTS `ROLES_CONDOMINAL`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ROLES_CONDOMINAL` (
  `id_roles_condominal` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `descripcion` text,
  `general` tinyint(1) NOT NULL DEFAULT '0',
  `tabla` varchar(20) DEFAULT NULL,
  `campo` varchar(20) DEFAULT NULL,
  `idGral` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_roles_condominal`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ROLES_CONDOMINAL_HAS_CAT_MODULOS`
--

DROP TABLE IF EXISTS `ROLES_CONDOMINAL_HAS_CAT_MODULOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ROLES_CONDOMINAL_HAS_CAT_MODULOS` (
  `id_roles_condominal_has_cat_modulos` int(11) NOT NULL AUTO_INCREMENT,
  `id_roles_condominal` int(11) NOT NULL,
  `id_cat_modulos` int(11) NOT NULL,
  `permiso` varchar(45) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_roles_condominal_has_cat_modulos`),
  KEY `fk_ROLES_CONDOMINAL_HAS_MODULOS_ROLES_CONDOMINAL_idx` (`id_roles_condominal`),
  KEY `fk_ROLES_CONDOMINAL_HAS_MODULOS_CAT_MODULOS1_idx` (`id_cat_modulos`),
  CONSTRAINT `ROLES_CONDOMINAL_HAS_CAT_MODULOS_ibfk_1` FOREIGN KEY (`id_cat_modulos`) REFERENCES `CAT_MODULOS` (`id_cat_modulos`),
  CONSTRAINT `ROLES_CONDOMINAL_HAS_CAT_MODULOS_ibfk_2` FOREIGN KEY (`id_roles_condominal`) REFERENCES `ROLES_CONDOMINAL` (`id_roles_condominal`)
) ENGINE=InnoDB AUTO_INCREMENT=1415 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TAREAS`
--

DROP TABLE IF EXISTS `TAREAS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TAREAS` (
  `id_tareas` int(11) NOT NULL AUTO_INCREMENT,
  `id_temas` int(11) NOT NULL,
  `descripcion` text NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `fecha_final` date DEFAULT NULL,
  `involucrado` varchar(255) CHARACTER SET utf8 DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  `estatus_tarea` int(11) NOT NULL DEFAULT '0' COMMENT '0 - Asignada, 1 - Terminada, 2 - Aprobada',
  PRIMARY KEY (`id_tareas`),
  KEY `fk_TAREAS_TEMAS1_idx` (`id_temas`),
  CONSTRAINT `fk_TAREAS_TEMAS1` FOREIGN KEY (`id_temas`) REFERENCES `TEMAS` (`id_temas`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TAREAS_ASIGNACIONES`
--

DROP TABLE IF EXISTS `TAREAS_ASIGNACIONES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TAREAS_ASIGNACIONES` (
  `id_tareas_asignaciones` int(11) NOT NULL AUTO_INCREMENT,
  `id_tareas` int(11) NOT NULL,
  `id_cat_puestos` int(11) NOT NULL,
  `id` int(11) DEFAULT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id_tareas_asignaciones`),
  KEY `fk_TAREAS_ASIGNACIONES_TAREAS1_idx` (`id_tareas`),
  CONSTRAINT `fk_TAREAS_ASIGNACIONES_TAREAS1` FOREIGN KEY (`id_tareas`) REFERENCES `TAREAS` (`id_tareas`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TEMAS`
--

DROP TABLE IF EXISTS `TEMAS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TEMAS` (
  `id_temas` int(11) NOT NULL AUTO_INCREMENT,
  `id_convocatorias` int(11) NOT NULL,
  `tema` text NOT NULL,
  `conclusiones` text,
  `total_favor` int(11) NOT NULL DEFAULT '0',
  `total_contra` int(11) NOT NULL DEFAULT '0',
  `total_abstencion` int(11) NOT NULL DEFAULT '0',
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `id_cat_status_temas` int(11) NOT NULL DEFAULT '1',
  `idcat_tipos_temas` int(11) NOT NULL DEFAULT '1',
  `tiempo` int(11) NOT NULL DEFAULT '0',
  `id_directorio` int(11) DEFAULT NULL,
  PRIMARY KEY (`id_temas`),
  KEY `fk_TEMAS_CONVOCATORIAS1_idx` (`id_convocatorias`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TICKETS`
--

DROP TABLE IF EXISTS `TICKETS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TICKETS` (
  `id_tickets` int(11) NOT NULL AUTO_INCREMENT,
  `id_tickets_departamentos` int(11) NOT NULL,
  `nombre` varchar(150) DEFAULT NULL,
  `descripcion` text NOT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  `id_directorio` int(11) NOT NULL,
  `id_cat_status_tickets` int(11) NOT NULL DEFAULT '1',
  `respuesta` text,
  `respuesta_usuario` longtext,
  `fecha_respuesta_usuario` datetime DEFAULT NULL,
  `pdf_respuesta` varchar(100) DEFAULT NULL,
  `imagen_respuesta` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id_tickets`),
  KEY `fk_TICKETS_TICKETS_DEPARTAMENTOS1_idx` (`id_tickets_departamentos`),
  KEY `fk_TICKETS_DIRECTORIO1_idx` (`id_directorio`),
  CONSTRAINT `fk_TICKETS_DIRECTORIO1` FOREIGN KEY (`id_directorio`) REFERENCES `DIRECTORIO` (`id_directorio`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_TICKETS_TICKETS_DEPARTAMENTOS1` FOREIGN KEY (`id_tickets_departamentos`) REFERENCES `TICKETS_DEPARTAMENTOS` (`id_tickets_departamentos`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TICKETS_DEPARTAMENTOS`
--

DROP TABLE IF EXISTS `TICKETS_DEPARTAMENTOS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TICKETS_DEPARTAMENTOS` (
  `id_tickets_departamentos` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) NOT NULL,
  `email` varchar(50) NOT NULL,
  `activo` tinyint(4) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_tickets_departamentos`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TOURS`
--

DROP TABLE IF EXISTS `TOURS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TOURS` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_encargado` varchar(255) NOT NULL,
  `nombre_tour` varchar(255) NOT NULL,
  `camion_placa` varchar(50) DEFAULT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `pax_adultos` int(11) DEFAULT '0',
  `pax_menores` int(11) DEFAULT '0',
  `activo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tours_fecha` (`fecha_inicio`,`fecha_fin`),
  KEY `idx_tours_activo` (`activo`),
  KEY `idx_tours_encargado` (`nombre_encargado`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='Tabla que maneja los tours programados';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `VOTACIONES_CONVOCATORIAS`
--

DROP TABLE IF EXISTS `VOTACIONES_CONVOCATORIAS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `VOTACIONES_CONVOCATORIAS` (
  `id_votaciones_convocatorias` int(11) NOT NULL AUTO_INCREMENT,
  `id` int(11) NOT NULL,
  `id_cat_tipos_votaciones` int(11) NOT NULL,
  `id_convocatorias_fechas` int(11) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `id_temas` int(11) NOT NULL,
  PRIMARY KEY (`id_votaciones_convocatorias`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `artistas`
--

DROP TABLE IF EXISTS `artistas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `artistas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `foto` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tel` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_artistas_email` (`email`),
  KEY `idx_artistas_nombre` (`nombre`),
  KEY `idx_artistas_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catalogo de artistas disponibles para presentaciones';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `campos_contacto`
--

DROP TABLE IF EXISTS `campos_contacto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campos_contacto` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `icono` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Nombre del icono de lucide-react (ej: MapPin, Phone, Mail, MessageCircle)',
  `color` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'blue' COMMENT 'Color del icono (blue, orange, emerald, purple, etc)',
  `titulo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Título del campo (ej: Ubicación, Teléfono)',
  `contenido` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Contenido principal del campo',
  `enlace` text COLLATE utf8mb4_unicode_ci COMMENT 'URL del enlace (ej: tel:, mailto:, https://)',
  `target` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT '_self' COMMENT 'Target del enlace (_self, _blank)',
  `orden` int(11) NOT NULL DEFAULT '0' COMMENT 'Orden de visualización',
  `activo` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1 = activo, 0 = inactivo',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orden` (`orden`),
  KEY `idx_activo` (`activo`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `disponibilidad_artistas`
--

DROP TABLE IF EXISTS `disponibilidad_artistas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `disponibilidad_artistas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_artista` int(11) NOT NULL,
  `dia_semana` tinyint(3) unsigned NOT NULL COMMENT '0=Domingo ... 6=Sabado',
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_disponibilidad_artista` (`id_artista`),
  KEY `idx_disponibilidad_dia` (`dia_semana`),
  KEY `idx_disponibilidad_rango` (`id_artista`,`dia_semana`,`hora_inicio`,`hora_fin`),
  CONSTRAINT `fk_disponibilidad_artista` FOREIGN KEY (`id_artista`) REFERENCES `artistas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Disponibilidad semanal por artista para algoritmo de asignacion';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `presentaciones_artistas`
--

DROP TABLE IF EXISTS `presentaciones_artistas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `presentaciones_artistas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_artista` int(11) NOT NULL,
  `id_escenario` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'UUID o slug unico del escenario en el mapa',
  `fecha_hora_inicio` datetime NOT NULL,
  `fecha_hora_fin` datetime NOT NULL,
  `estado` enum('programada','cancelada','finalizada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'programada',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_presentacion_exacta` (`id_artista`,`id_escenario`,`fecha_hora_inicio`,`fecha_hora_fin`),
  KEY `idx_presentaciones_escenario_fecha` (`id_escenario`,`fecha_hora_inicio`),
  KEY `idx_presentaciones_artista_fecha` (`id_artista`,`fecha_hora_inicio`),
  KEY `idx_presentaciones_rango` (`fecha_hora_inicio`,`fecha_hora_fin`),
  CONSTRAINT `fk_presentaciones_artista` FOREIGN KEY (`id_artista`) REFERENCES `artistas` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Agenda de presentaciones por artista y escenario';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-27 19:20:40
