// import {
//   BadRequestException,
//   Controller,
//   Get,
//   InternalServerErrorException,
//   NotFoundException,
//   Param,
//   Query,
// } from '@nestjs/common';

// import { DatabaseService } from '../../service/database/database.service';

// type CameraLogRow = {
//   camera_log_id: string;
//   details: string | null;
//   classification: string | null;
//   date_created: string;
// };

// function mapCameraLog(row: CameraLogRow) {
//   return {
//     id: row.camera_log_id,
//     details: row.details,
//     classification: row.classification,
//     date_created: row.date_created,
//   };
// }

// type SqlValue = string | number;

// @Controller('camera-logs')
// export class CameraLogsController {
//   constructor(private readonly databaseService: DatabaseService) {}

//   @Get(':customerId')
//   async getLogs(
//     @Param('customerId') customerId: string,
//     @Query('machineId') machineId?: string,
//     @Query('page') page = '1',
//     @Query('limit') limit = '10',
//     @Query('classification') classification?: string,
//   ) {
//     const pageNum = Number(page);
//     const limitNum = Number(limit);

//     if (!customerId) {
//       throw new BadRequestException('customerId is required');
//     }

//     if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
//       throw new BadRequestException('Invalid pagination parameters');
//     }

//     const offset = (pageNum - 1) * limitNum;
//     const client = this.databaseService.getClient();

//     try {
//       // Build WHERE clause safely
//       const where: string[] = ['cl.user_id = $1'];
//       const values: SqlValue[] = [customerId];

//       if (machineId) {
//         where.push(`cl.machine_id = $${values.length + 1}`);
//         values.push(machineId);

//         // 🔒 ensure machine belongs to customer & is active
//         const machineCheck = await client.query(
//           `
//           SELECT 1
//           FROM machines m
//           JOIN machine_customers mc ON mc.machine_id = m.machine_id
//           WHERE m.machine_id = $1
//             AND mc.customer_id = $2
//             AND m.is_active = true
//           LIMIT 1
//           `,
//           [machineId, customerId],
//         );

//         if (!machineCheck.rowCount) {
//           throw new NotFoundException('Machine not found for this customer');
//         }
//       }

//       if (classification) {
//         where.push(`cl.classification = $${values.length + 1}`);
//         values.push(classification);
//       }

//       // 🔢 total count
//       const countResult = await client.query<{ count: number }>(
//         `
//         SELECT COUNT(*)::int AS count
//         FROM camera_logs cl
//         WHERE ${where.join(' AND ')}
//         `,
//         values,
//       );

//       const total = countResult.rows[0].count;

//       // 📄 paginated data
//       const dataResult = await client.query<CameraLogRow>(
//         `
//         SELECT
//           cl.camera_log_id,
//           cl.details,
//           cl.classification,
//           cl.date_created
//         FROM camera_logs cl
//         WHERE ${where.join(' AND ')}
//         ORDER BY cl.date_created DESC
//         LIMIT $${values.length + 1}
//         OFFSET $${values.length + 2}
//         `,
//         [...values, limitNum, offset],
//       );

//       return {
//         ok: true,
//         pagination: {
//           page: pageNum,
//           limit: limitNum,
//           total,
//           totalPages: Math.ceil(total / limitNum),
//         },
//         logs: dataResult.rows.map(mapCameraLog),
//       };
//     } catch (error) {
//       if (
//         error instanceof BadRequestException ||
//         error instanceof NotFoundException
//       ) {
//         throw error;
//       }

//       throw new InternalServerErrorException('Failed to load camera logs');
//     }
//   }
// }
