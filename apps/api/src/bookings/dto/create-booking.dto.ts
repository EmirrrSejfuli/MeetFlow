
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateBookingDto {
  @IsUUID('4')
  slotId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  guestName!: string;

  @IsEmail()
  @MaxLength(254)
  guestEmail!: string;
}
