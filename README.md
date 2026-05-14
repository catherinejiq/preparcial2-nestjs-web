# Travel Plans API

API REST desarrollada con **NestJS** para gestionar planes de viaje con integración de datos de países desde una API externa con caché local.

## Características

- **Integración con REST Countries API**: Obtiene datos de países en tiempo real
- **Caché Local**: Almacena países en BD local para evitar llamadas repetidas
- **Autenticación**: Guard de administrador para operaciones sensibles
- **Gestión de Planes de Viaje**: CRUD completo de planes
- **Validaciones**: DTOs con validaciones automáticas
- **Base de Datos**: SQLite con TypeORM

---

## Requisitos Previos

- Node.js 16+ 
- npm o yarn
- Postman o similar para pruebas

---

## Instalación

1. **Clonar el repositorio:**
```bash
git clone <repository-url>
cd preparcial2-nestjs-web
```

2. **Instalar dependencias:**
```bash
npm install
```

---

## Ejecución del Proyecto

### Modo Desarrollo (con auto-reload)
```bash
npm run start:dev
```

### Modo Producción
```bash
npm run start:prod
```

### Pruebas
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Cobertura
npm run test:cov
```

El servidor estará disponible en `http://localhost:3000`

---

##  Arquitectura Interna

### Flujo de Caché de Países

```
┌────────────────────────────────────────────────────┐
│  TravelPlansService crea un plan de viaje         │
└────────────────────────────────────────────────────┘
                    │
                    ▼
    ┌──────────────────────────────────────┐
    │  CountriesService.findEntityByCode() │
    │         (Uso Interno)                │
    └──────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
   ¿Existe en BD?          RestCountriesProvider
   Local?                   (API externa)
        │                       │
       SÍ                      NO
        │                       │
        ├──────────────────────┤
                    ▼
            Guardar en BD Local
                    │
                    ▼
      Validación exitosa
      Plan de viaje creado
```

**IMPORTANTE:** El CountriesModule es **100% interno**. No expone endpoints públicos HTTP. Solo es utilizado por TravelPlansModule para validar países al crear planes de viaje.

### Módulos

**Countries Module:**
- `CountriesService`: Lógica de búsqueda y caché
- `CountriesController`: Endpoints de países
- `RestCountriesProvider`: Cliente HTTP a API externa
- `Country Entity`: Modelo de BD

**Travel Plans Module:**
- `TravelPlansService`: Crear y consultar planes
- `TravelPlansController`: Endpoints de planes
- `TravelPlan Entity`: Modelo con relación a Country

**Common:**
- `AdminGuard`: Valida token `Authorization: web123`
- `LoggerMiddleware`: Log de todas las peticiones

---

## Endpoints Públicos

**NOTA:** El único módulo que expone endpoints públicos es **TravelPlansModule**. El CountriesModule es 100% interno.

### Travel Plans (Interfaz Pública)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/travel-plans` | Crear nuevo plan de viaje |
| GET | `/travel-plans` | Listar todos los planes |
| GET | `/travel-plans/:id` | Obtener plan específico |
| DELETE | `/travel-plans/:id` | Eliminar un plan de viaje |

---

## Ejemplos de Peticiones en Postman

### 1. Crear Plan de Viaje

**Petición:**
```
POST http://localhost:3000/travel-plans
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "countryCode": "USA",
  "title": "Viaje a Nueva York",
  "startDate": "2024-06-15",
  "endDate": "2024-06-25",
  "notes": "Visitar Times Square, Central Park y el Empire State Building"
}
```

**Respuesta (201 Created):**
```json
{
  "id": 1,
  "countryCode": "USA",
  "title": "Viaje a Nueva York",
  "startDate": "2024-06-15",
  "endDate": "2024-06-25",
  "notes": "Visitar Times Square, Central Park y el Empire State Building"
}
```

**Errores Comunes:**
```json
// País no existe
{
  "message": "Country with code XYZ not found or API invalid.",
  "error": "Bad Request",
  "statusCode": 400
}

// Validación falló (fechas inválidas, campos faltantes)
{
  "message": ["countryCode must be a string", "startDate must be a valid ISO 8601 date string"],
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### 2. Listar Todos los Planes de Viaje

**Petición:**
```
GET http://localhost:3000/travel-plans
```

**Respuesta (200 OK):**
```json
[
  {
    "id": 1,
    "countryCode": "USA",
    "title": "Viaje a Nueva York",
    "startDate": "2024-06-15",
    "endDate": "2024-06-25",
    "notes": "Visitar Times Square, Central Park y el Empire State Building"
  }
]
```

---

### 3. Obtener Plan Específico

**Petición:**
```
GET http://localhost:3000/travel-plans/1
```

**Respuesta (200 OK):**
```json
{
  "id": 1,
  "countryCode": "USA",
  "title": "Viaje a Nueva York",
  "startDate": "2024-06-15",
  "endDate": "2024-06-25",
  "notes": "Visitar Times Square, Central Park y el Empire State Building"
}
```

---

### 4. Eliminar Plan de Viaje

**Petición:**
```
DELETE http://localhost:3000/travel-plans/1
```

**Respuesta (204 No Content):**
```
(sin contenido - solo status 204)
```

**Si el plan no existe:**
```json
{
  "message": "Travel plan with id 1 not found.",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

## Validación de Datos

El endpoint `POST /travel-plans` valida automáticamente:

- **countryCode**: Debe ser exactamente 3 caracteres (código Alpha-3)
- **title**: Debe ser un string no vacío
- **startDate**: Debe ser una fecha válida en formato ISO 8601
- **endDate**: Debe ser una fecha válida en formato ISO 8601
- **notes**: Opcional (puede omitirse)

**Ejemplo de validación fallida:**
```json
{
  "message": [
    "countryCode must be a string",
    "countryCode must be 3 characters long",
    "startDate must be a valid ISO 8601 date string"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

---

## Módulos Internos (Sin API Pública)

### CountriesModule

**Responsabilidades:**
- Gestionar caché de países en BD local
- Obtener países desde API externa (REST Countries) solo si no existen localmente
- Proporcionar servicio interno para validar países

**Característica clave - NO EXPONE ENDPOINTS HTTP**
- Solo es utilizado por `TravelPlansModule`
- La lógica de caché es transparente para el usuario
- Reduce llamadas a API externa automáticamente

---

## Estructura de Carpetas

```
src/
├── app.controller.ts
├── app.module.ts
├── app.service.ts
├── main.ts
├── common/
│   ├── guards/
│   │   └── admin.guard.ts
│   └── middleware/
│       └── logger.middleware.ts
├── countries/
│   ├── countries.controller.ts (No se registra - módulo interno)
│   ├── countries.module.ts
│   ├── countries.service.ts
│   ├── entities/
│   │   └── country.entity.ts
│   └── providers/
│       └── rest-countries.provider.ts
└── travel-plans/
    ├── travel-plans.controller.ts
    ├── travel-plans.module.ts
    ├── travel-plans.service.ts
    ├── dto/
    │   └── create-travel-plan.dto.ts
    └── entities/
        └── travel-plan.entity.ts
```

---

## Base de Datos

Se usa **SQLite** con **TypeORM**. La BD se genera automáticamente en `travel.db`.

**Tablas:**
- `country`: Caché de países
- `travel_plan`: Planes de viaje

---

## Tecnologías

- **NestJS**: Framework backend
- **TypeORM**: ORM para BD
- **SQLite**: Base de datos local
- **Axios**: Cliente HTTP
- **Class Validator**: Validaciones de DTOs
- **TypeScript**: Lenguaje

---

## Troubleshooting

**Error: "Country with code [CODE] not found or API invalid"**
- El país no existe en la API de REST Countries
- Verifica que usas el código ISO 3166-1 alpha-3 correcto (3 letras)
- Ej: `USA`, `FRA`, `GBR`, `MEX`, `COL`
- [Lista completa de códigos](https://restcountries.com/v3.1/all)

**Error: "Travel plan with id X not found" al eliminar**
- El plan con ese ID no existe
- Verifica el ID con `GET /travel-plans`

**Error de validación al crear plan**
- Verifica que todas las fechas estén en formato ISO 8601: `YYYY-MM-DD`
- Verifica que countryCode tenga exactamente 3 caracteres
- Verifica que title no sea vacío

**No se crean planes (sin error)**
- Asegúrate de que el servidor está corriendo: `npm run start:dev`
- Verifica que la BD `travel.db` existe en la raíz del proyecto
- Revisa los logs del servidor

**La API externa (REST Countries) está lenta o no responde**
- CountriesService intenta caché local primero
- Si la API falla, se obtiene el país de caché (si existe)
- Espera unos minutos y reintenta
