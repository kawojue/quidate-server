import { Roles } from 'src/role.decorator'
import { Request, Response } from 'express'
import { AuthGuard } from '@nestjs/passport'
import { Roles as Role } from '@prisma/client'
import { InvoiceService } from './invoice.service'
import { RolesGuard } from 'src/jwt/jwt-auth.guard'
import { CreateInvoiceDto } from './dto/create.dto'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import {
  Controller, Post, Get, UseGuards, Delete, Req, Res, Body, Param
} from '@nestjs/common'

@ApiTags('Invoice')
@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) { }

  @Post('/create')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.user)
  async createInvoice(
    @Req() req: IRequest,
    @Res() res: Response,
    @Body() body: CreateInvoiceDto
  ) {
    return await this.invoiceService.createInvoice(res, req.user, body)
  }

  @ApiBearerAuth()
  @Get('/fetch')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.user)
  async fetchInvoices(@Req() req: IRequest, @Res() res: Response) {
    return await this.invoiceService.fetchInvoices(res, req.user)
  }

  @Get('/:invoiceNo')
  async getInvoice(
    @Req() req: Request,
    @Res() res: Response,
    @Param('invoiceNo') invoiceNo: string
  ) {
    return await this.invoiceService.getInvoice(req, res, invoiceNo)
  }

  @ApiBearerAuth()
  @Delete('/:invoiceNo')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.user)
  async removeInvoice(
    @Res() res: Response,
    @Req() req: IRequest,
    @Param('invoiceNo') invoiceNo: string
  ) {
    return await this.invoiceService.removeInvoice(res, invoiceNo, req.user)
  }
}
