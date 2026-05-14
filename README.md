# Travel Plans API

API REST desarrollada con **NestJS** para gestionar planes de viaje con integración de datos de países desde una API externa con caché local.

## Características

- 🌍 **Integración con REST Countries API**: Obtiene datos de países en tiempo real
- 💾 **Caché Local**: Almacena países en BD local para evitar llamadas repetidas
- 🛡️ **Autenticación**: Guard de administrador para operaciones sensibles
- ✈️ **Gestión de Planes de Viaje**: CRUD completo de planes
- 📋 **Validaciones**: DTOs con validaciones automáticas
- 📊 **Base de Datos**: SQLite con TypeORM

---

## 📋 Requisitos Previos

- Node.js 16+ 
- npm o yarn
- Postman o similar para pruebas

---

## ⚙️ Instalación

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

## 🚀 Ejecución del Proyecto

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

## 🏗️ Arquitectura Interna

### Flujo de Caché de Países

```
┌─────────────────────────────────────────────┐
│  Cliente solicita GET /countries/:code      │
└─────────────────────────────────────────────┘
                    │
                    ▼
    ┌───────────────────────────────┐
    │  CountriesService.findOneByCode()
    └───────────────────────────────┘
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
         Retornar con source: 'local-cache'
                 o 'external-api'
```

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

## 📡 Endpoints

### Countries

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/countries` | Listar todos los países en caché | ❌ |
| GET | `/countries/:code` | Obtener país específico (con caché) | ❌ |
| POST | `/countries/sync` | Sincronizar 18 países comunes | ✅ |
| DELETE | `/countries/:code` | Eliminar país del caché | ✅ |

### Travel Plans

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/travel-plans` | Crear nuevo plan de viaje | ❌ |
| GET | `/travel-plans` | Listar todos los planes | ❌ |
| GET | `/travel-plans/:id` | Obtener plan específico | ❌ |

---

## 📝 Ejemplos de Peticiones en Postman

### 1️⃣ Sincronizar Countries (Datos iniciales)

**Petición:**
```
POST http://localhost:3000/countries/sync
Headers:
  Authorization: web123
  Content-Type: application/json
```

**Respuesta (200 OK):**
```json
{
  "message": "Sincronización completada",
  "synced": 18,
  "total": 18,
  "countries": [
    {
      "code": "USA",
      "name": "United States",
      "region": "Americas",
      "subregion": "North America",
      "capital": "Washington, D.C.",
      "population": 331002651,
      "flagUrl": "https://flagcdn.com/us.svg"
    },
    // ... más países
  ]
}
```

---

### 2️⃣ Crear Plan de Viaje

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

### 3️⃣ Listar Todos los Planes de Viaje

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
  },
  {
    "id": 2,
    "countryCode": "FRA",
    "title": "París Romántico",
    "startDate": "2024-07-01",
    "endDate": "2024-07-10",
    "notes": null
  }
]
```

---

### 4️⃣ Obtener Plan Específico

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

### 5️⃣ Consultar País (con Caché)

**Primera llamada (desde API):**
```
GET http://localhost:3000/countries/fra
```

**Respuesta:**
```json
{
  "code": "FRA",
  "name": "France",
  "region": "Europe",
  "subregion": "Western Europe",
  "capital": "Paris",
  "population": 67750000,
  "flagUrl": "https://flagcdn.com/fr.svg",
  "source": "external-api"
}
```

**Segunda llamada (desde caché local):**
```json
{
  "code": "FRA",
  "name": "France",
  "region": "Europe",
  "subregion": "Western Europe",
  "capital": "Paris",
  "population": 67750000,
  "flagUrl": "https://flagcdn.com/fr.svg",
  "source": "local-cache"
}
```

---

## 🔐 Autenticación

Algunos endpoints requieren el token de administrador:

```
Authorization: web123
```

**Endpoints protegidos:**
- `POST /countries/sync`
- `DELETE /countries/:code`

**Respuesta sin autenticación:**
```json
{
  "message": "Invalid or missing Authorization token",
  "error": "Unauthorized",
  "statusCode": 401
}
```

---

## 📦 Estructura de Carpetas

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
│   ├── countries.controller.ts
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

## 🗄️ Base de Datos

Se usa **SQLite** con **TypeORM**. La BD se genera automáticamente en `travel.db`.

**Tablas:**
- `country`: Caché de países
- `travel_plan`: Planes de viaje

---

## 📚 Tecnologías

- **NestJS**: Framework backend
- **TypeORM**: ORM para BD
- **SQLite**: Base de datos local
- **Axios**: Cliente HTTP
- **Class Validator**: Validaciones de DTOs
- **TypeScript**: Lenguaje

---

## 🐛 Troubleshooting

**Error: "Cannot POST /countries/sync"**
- Asegúrate de que el servidor está corriendo con `npm run start:dev`
- Verifica el header `Authorization: web123`

**Error: "Country not found"**
- El país debe estar en 3 letras (código ISO 3166-1 alpha-3)
- Ej: `USA`, `FRA`, `GBR`

**BD vacía en GET /countries**
- Primero ejecuta `POST /countries/sync` con `Authorization: web123`

---

## 📄 Licencia

MIT
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
