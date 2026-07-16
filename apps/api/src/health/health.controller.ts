import { Controller, Get } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";

@Controller("health")
@Public()
export class HealthController {
  @Get()
  verificar() {
    return { status: "ok" };
  }
}
