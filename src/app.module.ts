import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MerchantsModule } from './merchants/merchants.module';
import { OutletsModule } from './outlets/outlets.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { InventoryModule } from './inventory/inventory.module';
import { CartModule } from './cart/cart.module';
import { TransactionsModule } from './transactions/transactions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AiInsightsModule } from './ai-insights/ai-insights.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [AuthModule, UsersModule, MerchantsModule, OutletsModule, CategoriesModule, ProductsModule, InventoryModule, CartModule, TransactionsModule, DashboardModule, AnalyticsModule, AiInsightsModule, PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationOptions: { allowUnknown: true },
    }),
  ]
})
export class AppModule {}
