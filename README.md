# Travel Plans API

API REST desarrollada con **NestJS** para gestionar planes de viaje con integración de datos de países desde REST Countries API y caché local en SQLite.

---

## Requisitos previos

- Node.js 18+
- npm

---

## Instalación y ejecución

```bash
# 1. Clonar el repositorio
git clone https://github.com/catherinejiq/preparcial2-nestjs-web.git
cd preparcial2-nestjs-web

# 2. Instalar dependencias
npm install

# 3. Configurar variable de entorno para el guard de administrador
export ADMIN_TOKEN=tu_token_seguro

# 4. Iniciar en modo desarrollo (auto-reload)
npm run start:dev
```

El servidor queda disponible en `http://localhost:3000`.

La base de datos SQLite (`travel.db`) se genera automáticamente en la raíz del proyecto al primer arranque.

### Otros comandos

```bash
npm run build          # Compilar para producción
npm run start:prod     # Ejecutar build compilado
npm run test           # Unit tests
npm run test:e2e       # Tests end-to-end
npm run test:cov       # Cobertura
```

---

## Arquitectura interna

### Módulos

```
AppModule
├── CountriesModule      ← interno, sin endpoints públicos
│   ├── CountriesService
│   └── RestCountriesProvider
└── TravelPlansModule    ← único módulo con endpoints HTTP
    ├── TravelPlansController
    └── TravelPlansService  →  inyecta CountriesService
```

**CountriesModule** está configurado como módulo de infraestructura puro: no registra ningún controlador y no expone rutas HTTP. Solo exporta `CountriesService` para uso interno de `TravelPlansModule`.

**TravelPlansModule** importa `CountriesModule` y usa `CountriesService` para validar y cachear países antes de persistir un plan de viaje.

### Validación global

`ValidationPipe` está configurado globalmente en `main.ts` con:

- `whitelist: true` — descarta propiedades del body que no estén declaradas en el DTO.
- `forbidNonWhitelisted: true` — retorna 400 si el body contiene propiedades desconocidas.
- `transform: true` — convierte tipos automáticamente (e.g., `countryCode` se normaliza a mayúsculas vía `@Transform` en el DTO).

### Flujo de caché de países

Cuando `TravelPlansService` recibe una solicitud de creación, delega la resolución del país a `CountriesService.findEntityByCode()`, que sigue este flujo:

```
POST /travel-plans
        │
        ▼
TravelPlansService.create()
        │
        ▼
CountriesService.findEntityByCode(countryCode)
        │
        ▼
  ┌─────────────────────────────────────────┐
  │  ¿Existe en BD local y caché < 7 días? │
  └─────────────────────────────────────────┘
        │                   │
       SÍ                   NO
        │                   │
        │          ┌────────────────────────┐
        │          │ ¿Hay solicitud en      │
        │          │  vuelo para ese código?│
        │          └────────────────────────┘
        │                   │          │
        │                  SÍ          NO
        │                   │          │
        │            espera la   llama a REST
        │            promesa    Countries API
        │            existente       │
        │                   │        ▼
        │                   │   guarda/actualiza
        │                   │   en BD local
        │                   │        │
        └───────────────────┴────────┘
                            │
                            ▼
                  Plan de viaje persistido
```

**Detalles clave:**
- TTL de caché: **7 días**. Si el registro en BD tiene más de 7 días, se descarta y se consulta la API externa.
- **Deduplicación in-flight**: si dos solicitudes simultáneas piden el mismo código de país, solo se hace una llamada a la API. La segunda espera la promesa de la primera.
- El provider aplica un timeout de **10 segundos** a la API externa.

---

## Endpoints

El único módulo con API pública es `TravelPlansModule`.

| Método   | Endpoint              | Descripción                   | Auth |
|----------|-----------------------|-------------------------------|------|
| `POST`   | `/travel-plans`       | Crear un plan de viaje        | No   |
| `GET`    | `/travel-plans`       | Listar todos los planes       | No   |
| `GET`    | `/travel-plans/:id`   | Obtener un plan por ID        | No   |
| `DELETE` | `/travel-plans/:id`   | Eliminar un plan por ID       | No   |

> El `AdminGuard` existe y está disponible para proteger rutas con `@UseGuards(AdminGuard)`. Requiere el header `Authorization: Bearer <ADMIN_TOKEN>` donde el valor de `ADMIN_TOKEN` se lee de la variable de entorno del mismo nombre.

---

## Ejemplos de peticiones en Postman

### Crear un plan de viaje

**Request**
```
POST http://localhost:3000/travel-plans
Content-Type: application/json
```

```json
{
  "countryCode": "col",
  "title": "Semana en Cartagena",
  "startDate": "2025-07-10",
  "endDate": "2025-07-17",
  "notes": "Ciudad amurallada, Islas del Rosario, Getsemaní"
}
```

> `countryCode` acepta minúsculas — el DTO lo normaliza a `"COL"` automáticamente.

**Response 201 Created**
```json
{
  "id": 1,
  "countryCode": "COL",
  "title": "Semana en Cartagena",
  "startDate": "2025-07-10",
  "endDate": "2025-07-17",
  "notes": "Ciudad amurallada, Islas del Rosario, Getsemaní",
  "createdAt": "2025-07-01T14:30:00.000Z"
}
```

---

### Errores al crear — validación de entrada

**País inválido (código no existe en REST Countries)**
```
POST http://localhost:3000/travel-plans
```
```json
{ "countryCode": "XYZ", "title": "Test", "startDate": "2025-08-01", "endDate": "2025-08-10" }
```
```json
{
  "message": "Country with code XYZ not found or API invalid.",
  "error": "Bad Request",
  "statusCode": 400
}
```

**`endDate` anterior a `startDate`**
```json
{ "countryCode": "USA", "title": "Test", "startDate": "2025-08-10", "endDate": "2025-08-01" }
```
```json
{
  "message": ["endDate must be after startDate"],
  "error": "Bad Request",
  "statusCode": 400
}
```

**Campo desconocido en el body (whitelist activo)**
```json
{ "countryCode": "USA", "title": "Test", "startDate": "2025-08-01", "endDate": "2025-08-10", "precio": 500 }
```
```json
{
  "message": ["property precio should not exist"],
  "error": "Bad Request",
  "statusCode": 400
}
```

**Campos faltantes o con formato incorrecto**
```json
{ "countryCode": "US", "title": "", "startDate": "10-08-2025" }
```
```json
{
  "message": [
    "countryCode must be longer than or equal to 3 and shorter than or equal to 3 characters",
    "title should not be empty",
    "startDate must be a valid ISO 8601 date string",
    "endDate must be a valid ISO 8601 date string"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### Listar todos los planes

**Request**
```
GET http://localhost:3000/travel-plans
```

**Response 200 OK**
```json
[
  {
    "id": 1,
    "countryCode": "COL",
    "title": "Semana en Cartagena",
    "startDate": "2025-07-10",
    "endDate": "2025-07-17",
    "notes": "Ciudad amurallada, Islas del Rosario, Getsemaní",
    "createdAt": "2025-07-01T14:30:00.000Z"
  },
  {
    "id": 2,
    "countryCode": "FRA",
    "title": "París en otoño",
    "startDate": "2025-10-05",
    "endDate": "2025-10-12",
    "notes": null,
    "createdAt": "2025-07-02T09:15:00.000Z"
  }
]
```

---

### Obtener un plan por ID

**Request**
```
GET http://localhost:3000/travel-plans/1
```

**Response 200 OK**
```json
{
  "id": 1,
  "countryCode": "COL",
  "title": "Semana en Cartagena",
  "startDate": "2025-07-10",
  "endDate": "2025-07-17",
  "notes": "Ciudad amurallada, Islas del Rosario, Getsemaní",
  "createdAt": "2025-07-01T14:30:00.000Z"
}
```

**ID no encontrado — 404**
```
GET http://localhost:3000/travel-plans/99
```
```json
{
  "message": "Travel plan with id 99 not found.",
  "error": "Not Found",
  "statusCode": 404
}
```

**ID no numérico — 400**
```
GET http://localhost:3000/travel-plans/abc
```
```json
{
  "message": "Validation failed (numeric string is expected)",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

### Eliminar un plan

**Request**
```
DELETE http://localhost:3000/travel-plans/1
```

**Response 204 No Content** *(sin cuerpo)*

**Plan no encontrado — 404**
```
DELETE http://localhost:3000/travel-plans/99
```
```json
{
  "message": "Travel plan with id 99 not found.",
  "error": "Not Found",
  "statusCode": 404
}
```

---

## Reglas de validación del DTO

| Campo         | Tipo     | Reglas                                                    |
|---------------|----------|-----------------------------------------------------------|
| `countryCode` | `string` | Exactamente 3 chars, normalizado a mayúsculas, requerido  |
| `title`       | `string` | No vacío, máximo 200 caracteres, requerido                |
| `startDate`   | `string` | Formato ISO 8601 (`YYYY-MM-DD`), requerido                |
| `endDate`     | `string` | Formato ISO 8601, debe ser posterior a `startDate`        |
| `notes`       | `string` | Opcional, máximo 1000 caracteres                          |

---

## Estructura del proyecto

```
src/
├── main.ts                          ← ValidationPipe global
├── app.module.ts                    ← TypeORM (SQLite) + middlewares
├── common/
│   ├── guards/admin.guard.ts        ← Bearer token desde ADMIN_TOKEN env
│   └── middleware/logger.middleware.ts
├── countries/
│   ├── countries.module.ts          ← sin controller registrado
│   ├── countries.service.ts         ← caché + deduplicación in-flight
│   ├── entities/country.entity.ts
│   └── providers/rest-countries.provider.ts
└── travel-plans/
    ├── travel-plans.controller.ts   ← ParseIntPipe en :id
    ├── travel-plans.service.ts
    ├── dto/create-travel-plan.dto.ts
    └── entities/travel-plan.entity.ts
```

---

## Tecnologías

| Tecnología       | Uso                          |
|------------------|------------------------------|
| NestJS 11        | Framework                    |
| TypeORM 0.3      | ORM                          |
| SQLite           | Base de datos local          |
| class-validator  | Validación de DTOs           |
| class-transformer| Transformación de entradas   |
| Axios / rxjs     | Cliente HTTP con timeout     |
| TypeScript 5     | Lenguaje                     |

---

## Cambios para Parcial 2

### 1. Gastos embebidos en TravelPlan

Se agregó el campo `expenses` a la entidad `TravelPlan` como un arreglo de objetos JSON almacenado con el tipo `simple-json` de TypeORM. Cada gasto contiene `description` (string, requerido), `amount` (number positivo, requerido) y `category` (string, requerido), definidos a través de la interfaz `Expense` y validados por `CreateExpenseDto`.

La inserción individual de gastos se implementó sin tablas adicionales: el servicio recupera el plan por ID, hace `push` del nuevo objeto al arreglo `expenses` en memoria y persiste el plan completo con `repository.save()`. SQLite serializa el arreglo actualizado como texto JSON en la misma fila. Esto es equivalente al operador `$push` de MongoDB pero operando sobre el objeto en memoria antes de la escritura.

Endpoint nuevo:

| Método | Endpoint                      | Descripción                          |
|--------|-------------------------------|--------------------------------------|
| `POST` | `/travel-plans/:id/expenses`  | Agrega un gasto al plan indicado     |

**Body esperado:**
```json
{
  "description": "Vuelo ida y vuelta",
  "amount": 450.00,
  "category": "Transporte"
}
```

`GET /travel-plans/:id` ya devuelve el arreglo `expenses` completo como parte de la respuesta.

---

### 2. Módulo de Usuarios y vinculación con TravelPlan

Se creó `UsersModule` con la entidad `User` (campos: `id`, `name`, `email`) y su correspondiente controlador y servicio (CRUD básico).

La entidad `TravelPlan` recibió el campo `userId` (number, requerido). Al crear un plan con `POST /travel-plans`, el servicio llama a `UsersService.findOne(userId)` antes de persistir; si el usuario no existe se lanza un `NotFoundException` (HTTP 404).

Endpoints nuevos:

| Método   | Endpoint        | Descripción              |
|----------|-----------------|--------------------------|
| `POST`   | `/users`        | Crear un usuario         |
| `GET`    | `/users`        | Listar todos             |
| `GET`    | `/users/:id`    | Obtener usuario por ID   |
| `DELETE` | `/users/:id`    | Eliminar usuario por ID  |

---

### 3. Telemetría mediante Middleware

Se modificó `LoggerMiddleware` para extraer el header `x-user-id` de cada petición entrante. El middleware imprime en consola:

```
[User: <ID>] accedió a <RUTA> - <MÉTODO>
```

Si el header no está presente, el log muestra `[User: ANONYMOUS]`. El middleware está registrado en `AppModule` y se aplica a las rutas `/travel-plans` y `/users`.
