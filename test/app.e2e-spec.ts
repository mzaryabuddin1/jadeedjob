import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { ApiExceptionFilter } from '../src/common/errors/api-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const routeManifest = require('./openapi-route-manifest.json') as {
  operationCount: number;
  operations: string[];
};

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new ApiExceptionFilter());
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('JadeedJob API').setVersion('e2e').build(),
    );
    SwaggerModule.setup('docs', app, document, {
      jsonDocumentUrl: 'docs-json',
    });
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

  it('/docs-json preserves every checked-in route and method', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);
    expect(routeManifest.operations).toHaveLength(routeManifest.operationCount);
    const missing = routeManifest.operations.filter((operation) => {
      const separator = operation.indexOf(' ');
      const method = operation.slice(0, separator).toLowerCase();
      const path = operation.slice(separator + 1);
      return !body.paths?.[path]?.[method];
    });
    expect(missing).toEqual([]);

    expect(
      body.components.schemas.InvitationProjectionDto.required,
    ).toEqual(expect.arrayContaining(['id', 'invitationId', 'status', 'viewerAction']));
    expect(
      body.components.schemas.RegisterSendOtpDto.properties,
    ).toEqual(
      expect.objectContaining({
        legalAcceptances: expect.any(Object),
        clientPlatform: expect.any(Object),
      }),
    );
    expect(
      body.components.schemas.ResolveModerationReportDto.properties.action.enum,
    ).toEqual(['dismiss', 'hide', 'remove', 'warn', 'suspend', 'ban']);
    expect(
      body.paths['/public/account-deletion/confirm'].post.requestBody.content[
        'application/json'
      ].schema.$ref,
    ).toBe('#/components/schemas/PublicAccountDeletionConfirmDto');
    expect(
      body.paths['/job'].post.parameters,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          in: 'header',
          name: 'Idempotency-Key',
          required: false,
        }),
      ]),
    );
    expect(body.paths['/posts'].post.responses['428']).toBeDefined();
  });
});
