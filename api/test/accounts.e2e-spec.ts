import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('AccountsController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const create = (body: object) =>
    request(app.getHttpServer()).post('/accounts').send(body);

  describe('POST /accounts', () => {
    it('crea una clase con naturaleza explícita (201)', async () => {
      const res = await create({ code: '1', name: 'Activo', nature: 'debito' });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ code: '1', name: 'Activo', nature: 'debito' });
    });

    it('crea una subcuenta heredando la naturaleza del padre (201)', async () => {
      await create({ code: '1', name: 'Activo', nature: 'debito' });
      await create({ code: '11', name: 'Disponible' });
      await create({ code: '1105', name: 'Caja' });
      const res = await create({ code: '110505', name: 'Caja general' });
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ code: '110505', name: 'Caja general', nature: 'debito' });
    });

    it('rechaza un código no numérico (400)', async () => {
      const res = await create({ code: '11a5', name: 'X' });
      expect(res.status).toBe(400);
    });

    it('rechaza una longitud de nivel inválida (400)', async () => {
      const res = await create({ code: '110', name: 'X' });
      expect(res.status).toBe(400);
    });

    it('rechaza un nombre vacío (400)', async () => {
      const res = await create({ code: '1', name: '   ' });
      expect(res.status).toBe(400);
    });

    it('rechaza una clase sin naturaleza (400)', async () => {
      const res = await create({ code: '1', name: 'Activo' });
      expect(res.status).toBe(400);
    });

    it('rechaza códigos duplicados (409)', async () => {
      await create({ code: '1', name: 'Activo', nature: 'debito' });
      const res = await create({ code: '1', name: 'Otro', nature: 'credito' });
      expect(res.status).toBe(409);
    });

    it('rechaza una cuenta huérfana (404)', async () => {
      const res = await create({ code: '1105', name: 'Caja' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /accounts/tree', () => {
    it('devuelve [] con el catálogo vacío (200)', async () => {
      const res = await request(app.getHttpServer()).get('/accounts/tree');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it('devuelve el catálogo anidado por prefijo y ordenado (200)', async () => {
      await create({ code: '2', name: 'Pasivo', nature: 'credito' });
      await create({ code: '1', name: 'Activo', nature: 'debito' });
      await create({ code: '11', name: 'Disponible' });
      await create({ code: '1105', name: 'Caja' });
      await create({ code: '110505', name: 'Caja general' });

      const res = await request(app.getHttpServer()).get('/accounts/tree');
      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        {
          code: '1',
          name: 'Activo',
          nature: 'debito',
          children: [
            {
              code: '11',
              name: 'Disponible',
              nature: 'debito',
              children: [
                {
                  code: '1105',
                  name: 'Caja',
                  nature: 'debito',
                  children: [
                    { code: '110505', name: 'Caja general', nature: 'debito', children: [] },
                  ],
                },
              ],
            },
          ],
        },
        { code: '2', name: 'Pasivo', nature: 'credito', children: [] },
      ]);
    });
  });

  describe('DELETE /accounts/:code', () => {
    it('elimina una cuenta sin hijas (204)', async () => {
      await create({ code: '1', name: 'Activo', nature: 'debito' });
      await create({ code: '11', name: 'Disponible' });
      const res = await request(app.getHttpServer()).delete('/accounts/11');
      expect(res.status).toBe(204);
    });

    it('rechaza eliminar una cuenta con hijas (409)', async () => {
      await create({ code: '1', name: 'Activo', nature: 'debito' });
      await create({ code: '11', name: 'Disponible' });
      const res = await request(app.getHttpServer()).delete('/accounts/1');
      expect(res.status).toBe(409);
    });

    it('rechaza eliminar un código inexistente (404)', async () => {
      const res = await request(app.getHttpServer()).delete('/accounts/9999');
      expect(res.status).toBe(404);
    });
  });
});
