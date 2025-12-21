import { Body, Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto, RegisterAccountantDto } from './dto/register.dto';
import { SignupDto } from './dto/signup.dto';
import { RequestPasswordResetDto, ResetPasswordDto } from './dto/password-reset.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login de usuário', description: 'Autentica usuário (contador ou cliente) e retorna tokens JWT' })
  @ApiResponse({ status: 200, description: 'Login bem-sucedido' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Registro de cliente', description: 'Cria novo usuário cliente' })
  @ApiResponse({ status: 201, description: 'Cliente criado com sucesso' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('register-accountant')
  @ApiOperation({ summary: 'Registro de contador', description: 'Cria novo usuário contador com período trial de 30 dias' })
  @ApiResponse({ status: 201, description: 'Contador criado com sucesso' })
  @ApiResponse({ status: 409, description: 'E-mail ou CNPJ já cadastrado' })
  async registerAccountant(@Body() registerDto: RegisterAccountantDto) {
    return this.authService.registerAccountant(registerDto);
  }

  @Post('signup')
  @ApiOperation({
    summary: 'Signup unificado',
    description: 'Cria novo usuário (INDIVIDUAL ou ACCOUNTANT_FIRM) com trial de 14 dias e subscription automática'
  })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso e retorna access token' })
  @ApiResponse({ status: 409, description: 'E-mail ou CPF/CNPJ já cadastrado' })
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Renovar access token', description: 'Gera novo access token usando refresh token' })
  @ApiBody({ schema: { properties: { refreshToken: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Token renovado com sucesso' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido ou expirado' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshAccessToken(refreshToken);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout', description: 'Invalida refresh token do usuário' })
  @ApiBody({ schema: { properties: { refreshToken: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Logout realizado com sucesso' })
  async logout(@Body('refreshToken') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }

  @Post('request-password-reset')
  @ApiOperation({ summary: 'Solicitar redefinição de senha', description: 'Envia link de redefinição de senha para o e-mail (dev: imprime no console)' })
  @ApiResponse({ status: 200, description: 'Solicitação processada' })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Redefinir senha', description: 'Redefine senha usando token recebido por e-mail' })
  @ApiResponse({ status: 200, description: 'Senha redefinida com sucesso' })
  @ApiResponse({ status: 401, description: 'Token inválido ou expirado' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Obter perfil do usuário autenticado', description: 'Retorna dados do usuário logado' })
  @ApiResponse({ status: 200, description: 'Perfil retornado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async getProfile(@Request() req) {
    return this.authService.validateUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ACCOUNTANT')
  @ApiBearerAuth()
  @Post('complete-onboarding')
  @ApiOperation({ summary: 'Completar onboarding', description: 'Marca o onboarding do contador como concluído' })
  @ApiResponse({ status: 200, description: 'Onboarding completado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas contadores' })
  async completeOnboarding(@Request() req) {
    return this.authService.completeOnboarding(req.user.id);
  }
}

@Controller('users')
@ApiTags('users')
export class UsersController {
  constructor(private authService: AuthService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ACCOUNTANT')
  @ApiBearerAuth()
  @Get('me/onboarding-progress')
  @ApiOperation({
    summary: 'Obter progresso do onboarding',
    description: 'Retorna o progresso das tarefas de onboarding do contador'
  })
  @ApiResponse({ status: 200, description: 'Progresso retornado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  @ApiResponse({ status: 403, description: 'Acesso negado - apenas contadores' })
  async getOnboardingProgress(@Request() req) {
    return this.authService.getOnboardingProgress(req.user.id);
  }
}
