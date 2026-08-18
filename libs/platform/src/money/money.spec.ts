// memverifikasi operasi aritmatika, perbandingan, dan utilitas Money value object.
import { Prisma } from '@prisma/client';
import { Money } from './money';

describe('Money', () => {
  describe('factory', () => {
    it('membuat Money dari string desimal', () => {
      const m = Money.of('15000.50');
      expect(m.toString()).toBe('15000.50');
      expect(m.amount).toBeInstanceOf(Prisma.Decimal);
    });

    it('membuat Money dari number', () => {
      const m = Money.of(2500);
      expect(m.toString()).toBe('2500.00');
    });

    it('membuat Money dari Prisma.Decimal', () => {
      const m = Money.of(new Prisma.Decimal('100'));
      expect(m.toString()).toBe('100.00');
    });

    it('Money.zero() menghasilkan 0.00', () => {
      const m = Money.zero();
      expect(m.isZero()).toBe(true);
      expect(m.toString()).toBe('0.00');
    });
  });

  describe('aritmatika', () => {
    const a = Money.of('10000');
    const b = Money.of('3500');

    it('add menjumlahkan dua Money', () => {
      expect(a.add(b).toString()).toBe('13500.00');
    });

    it('subtract mengurangi dua Money', () => {
      expect(a.subtract(b).toString()).toBe('6500.00');
    });

    it('multiply mengalikan dengan skalar', () => {
      expect(a.multiply(3).toString()).toBe('30000.00');
    });

    it('divide membagi dengan skalar', () => {
      expect(a.dividedBy(4).toString()).toBe('2500.00');
    });

    it('aritmatika dengan desimal presisi', () => {
      const price = Money.of('8500');
      const qty = 2;
      expect(price.multiply(qty).toString()).toBe('17000.00');
    });
  });

  describe('perbandingan', () => {
    const big = Money.of('20000');
    const small = Money.of('15000');
    const same = Money.of('20000');

    it('greaterThan benar untuk lebih besar', () => {
      expect(big.greaterThan(small)).toBe(true);
      expect(small.greaterThan(big)).toBe(false);
    });

    it('lessThan benar untuk lebih kecil', () => {
      expect(small.lessThan(big)).toBe(true);
      expect(big.lessThan(small)).toBe(false);
    });

    it('equals benar untuk nilai sama', () => {
      expect(big.equals(same)).toBe(true);
      expect(big.equals(small)).toBe(false);
    });
  });

  describe('utilitas', () => {
    it('isNegative benar untuk negatif', () => {
      expect(Money.of('-100').isNegative()).toBe(true);
      expect(Money.of('0').isNegative()).toBe(false);
      expect(Money.of('100').isNegative()).toBe(false);
    });

    it('isZero benar untuk nol', () => {
      expect(Money.of('0').isZero()).toBe(true);
      expect(Money.of('0.00').isZero()).toBe(true);
      expect(Money.of('1').isZero()).toBe(false);
    });

    it('toDecimal mengembalikan Prisma.Decimal', () => {
      const m = Money.of('5000');
      expect(m.toDecimal()).toBeInstanceOf(Prisma.Decimal);
      expect(m.toDecimal().toString()).toBe('5000');
    });

    it('toString format 2 desimal', () => {
      expect(Money.of('1').toString()).toBe('1.00');
      expect(Money.of('1.5').toString()).toBe('1.50');
      expect(Money.of('1.555').toString()).toBe('1.56');
    });
  });
});
