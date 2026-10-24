import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MaxLength } from 'class-validator';

export class AccountEmailDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
}
export class LoginDto extends AccountEmailDto {
  @IsString()
  @Length(1, 128)
  password!: string;
}
export class AcceptInvitationDto extends LoginDto {
  @IsString()
  @Length(15, 128)
  declare password: string;

  @Matches(/^[A-Za-z0-9_-]{43}$/)
  invitationToken!: string;
}

export class ResetPasswordDto extends LoginDto {
  @IsString()
  @Length(15, 128)
  declare password: string;

  @Matches(/^[A-Za-z0-9_-]{43}$/)
  resetToken!: string;
}

export class RecoveryStatusDto extends AccountEmailDto {
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  resetToken!: string;
}
