import { validate } from 'class-validator';
import { CreateProductDto } from './create-product.dto';
import { UpdateCategoryDto } from './update-category.dto';

// memverifikasi validasi request sebelum controller memanggil application service.
// test ini hanya menguji bentuk input dan bukan aturan bisnis database.
describe('Catalog DTO validation', () => {
  it('FR-CAT-003: menolak price negatif/format non-decimal dan threshold negatif', async () => {
    const dto = Object.assign(new CreateProductDto(), {
      name: 'Produk',
      price: '-1',
      category_id: 'not-a-uuid',
      low_stock_threshold: -1,
    });
    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('menolak is_active non-boolean', async () => {
    const dto = Object.assign(new UpdateCategoryDto(), { is_active: 'false' });
    expect(await validate(dto)).not.toHaveLength(0);
  });
});
