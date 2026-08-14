export class ProductDto {
  id: string;
  merchant_id: string;
  category_id: string;
  category_name: string;
  name: string;
  price: string;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
