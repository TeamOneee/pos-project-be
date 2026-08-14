import { Prisma } from '@prisma/client';

export class Money {
  private constructor(readonly amount: Prisma.Decimal) {}

  static of(input: Prisma.Decimal.Value): Money {
    return new Money(new Prisma.Decimal(input));
  }

  static zero(): Money {
    return Money.of('0');
  }

  add(other: Money): Money {
    return new Money(this.amount.add(other.amount));
  }

  subtract(other: Money): Money {
    return new Money(this.amount.sub(other.amount));
  }

  multiply(multiplier: Prisma.Decimal.Value): Money {
    return new Money(this.amount.mul(new Prisma.Decimal(multiplier)));
  }

  dividedBy(divisor: Prisma.Decimal.Value): Money {
    return new Money(this.amount.div(new Prisma.Decimal(divisor)));
  }

  greaterThan(other: Money): boolean {
    return this.amount.greaterThan(other.amount);
  }

  lessThan(other: Money): boolean {
    return this.amount.lessThan(other.amount);
  }

  equals(other: Money): boolean {
    return this.amount.equals(other.amount);
  }

  isNegative(): boolean {
    return this.amount.isNegative();
  }

  isZero(): boolean {
    return this.amount.isZero();
  }

  toDecimal(): Prisma.Decimal {
    return this.amount;
  }

  toString(): string {
    return this.amount.toFixed(2);
  }
}
