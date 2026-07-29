import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { ApiExceptionFilter } from '../src/common/errors/api-exception.filter';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/job (GET) remains public while myjobs requires authentication', async () => {
    await request(app.getHttpServer()).get('/job?page=1&limit=1').expect(200);

    await request(app.getHttpServer())
      .get('/job?myjobs=true')
      .expect(401)
      .expect(({ body }) => {
        expect(body.code).toBe('AUTH_SESSION_INVALID');
      });
  });
});
