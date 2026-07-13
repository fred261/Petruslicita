import { Module } from "@nestjs/common";
import { ClientesController } from "./clientes.controller";
import { ClientesService } from "./clientes.service";
import { CnpjLookupService } from "./cnpj-lookup/cnpj-lookup.service";
import { BrasilApiAdapter } from "./cnpj-lookup/adapters/brasil-api.adapter";
import { CnpjWsAdapter } from "./cnpj-lookup/adapters/cnpjws.adapter";

@Module({
  controllers: [ClientesController],
  providers: [ClientesService, CnpjLookupService, BrasilApiAdapter, CnpjWsAdapter],
  exports: [ClientesService],
})
export class ClientesModule {}
