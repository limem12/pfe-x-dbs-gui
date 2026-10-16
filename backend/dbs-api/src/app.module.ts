import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { StepsModule } from './steps/steps.module';
import { SequencesModule } from './sequences/sequences.module';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';
import { HistoryModule } from './history/history.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { RightsModule } from './rights/rights.module';
import { UploadsModule } from './uploads/uploads.module';
import { ProductCounterModule } from './product-counter/product-counter.module';
import { ProductStatusModule } from './product-status/product-status.module';
import { StatusModule } from './status/status.module';
import { StepStatusModule } from './step-status/step-status.module';
import { ExecutionModeModule } from './execution-mode/execution-mode.module';
import { StepModule } from './step/step.module';
import { StepParamModule } from './step-param/step-param.module';
import { StepLimitModule } from './step-limit/step-limit.module';
import { SequenceModule } from './sequence/sequence.module';
import { SequenceStepModule } from './sequence-step/sequence-step.module';
import { ProductSequenceModule } from './product-sequence/product-sequence.module';
import { ProductStepParamModule } from './product-step-param/product-step-param.module';
import { ComponentInstanceModule } from './component-instance/component-instance.module';
import { ProductStepLimitModule } from './product-step-limit/product-step-limit.module';
import { ProductExecutionConfigModule } from './product-execution-config/product-execution-config.module';
import { AuditInterceptor } from './common/audit.interceptor';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    StepsModule,
    SequencesModule,
    ProductsModule,
    UsersModule,
    HistoryModule,
    RolesModule,
    RightsModule,
    UploadsModule,
    ProductCounterModule,
    ProductStatusModule,
    StatusModule,
    StepStatusModule,
    ExecutionModeModule,
    StepModule,
    StepParamModule,
    StepLimitModule,
    SequenceModule,
    SequenceStepModule,
    ProductSequenceModule,
    ProductStepParamModule,
    ComponentInstanceModule,
    ProductStepLimitModule,
    ProductExecutionConfigModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
