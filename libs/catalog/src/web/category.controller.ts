import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  AuthUser,
  CurrentUser,
  PageRequestDto,
  PageResponseDto,
  Roles,
} from '@app/platform';
import { CategoryResult } from '../application/catalog.models';
import { CategoryService } from '../application/category.service';
import { toCategoryDto } from './catalog.presenter';
import { CategoryListQueryDto } from './dto/category-list-query.dto';
import { CategoryDto } from './dto/category.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
// menyediakan api category dengan mutasi khusus admin.
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryDto> {
    return toCategoryDto(
      await this.categoryService.create(actor, { name: dto.name }),
    );
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @CurrentUser() actor: AuthUser,
    @Query() query: CategoryListQueryDto,
    @Query() page: PageRequestDto,
  ): Promise<PageResponseDto<CategoryDto>> {
    return this.mapPage(
      await this.categoryService.list(
        actor,
        { isActive: query.is_active },
        page,
      ),
    );
  }

  @Patch(':category_id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async update(
    @CurrentUser() actor: AuthUser,
    @Param('category_id', ParseUUIDPipe) categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    return toCategoryDto(
      await this.categoryService.update(actor, categoryId, {
        name: dto.name,
        isActive: dto.is_active,
      }),
    );
  }

  private mapPage(
    page: PageResponseDto<CategoryResult>,
  ): PageResponseDto<CategoryDto> {
    return PageResponseDto.from(
      page.content.map(toCategoryDto),
      page.page,
      page.size,
      page.total_elements,
    );
  }
}
