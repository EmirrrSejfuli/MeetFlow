
import {
  IsInt,
  IsISO8601,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateSlotDto {
  @IsISO8601({ strict: true })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/, {
    message: 'startsAt must include a timezone',
  })
  startsAt!: string;

  @IsInt()
  @Min(15)
  @Max(240)
  durationMinutes!: number;
}
