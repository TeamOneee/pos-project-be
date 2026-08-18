import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PageRequestDto } from './page-request.dto';

describe('PageRequestDto', () => {
  it('default page=0 dan size=20', () => {
    const dto = plainToInstance(PageRequestDto, {});
    expect(dto.page).toBe(0);
    expect(dto.size).toBe(20);
  });

  it('skip menghitung page * size', () => {
    const dto = plainToInstance(PageRequestDto, { page: 3, size: 10 });
    expect(dto.skip).toBe(30);
    expect(dto.take).toBe(10);
  });

  it('skip=0 untuk page=0', () => {
    const dto = plainToInstance(PageRequestDto, { page: 0, size: 50 });
    expect(dto.skip).toBe(0);
    expect(dto.take).toBe(50);
  });

  it('validasi menolak page negatif', async () => {
    const dto = plainToInstance(PageRequestDto, { page: -1 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('validasi menolak size > 100', async () => {
    const dto = plainToInstance(PageRequestDto, { size: 101 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('validasi menolak size < 1', async () => {
    const dto = plainToInstance(PageRequestDto, { size: 0 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('validasi menerima page dan size yang valid', async () => {
    const dto = plainToInstance(PageRequestDto, { page: 2, size: 50 });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
