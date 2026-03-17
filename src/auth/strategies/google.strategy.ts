/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import config from 'config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('google.clientId') ?? config.google.clientId as string,
      clientSecret: configService.get<string>('google.clientSecret') ?? config.google.clientSecret as string,
      callbackURL: configService.get<string>('google.callbackUrl') ?? config.google.callbackUrl as string,
      scope: ['email', 'profile'],
    });
  }

  async validate(_at: string, _rt: string, profile: any, done: VerifyCallback) {
    const { name, emails, photos } = profile;
    done(null, {
      email: emails[0].value,
      name: `${name.givenName} ${name.familyName}`,
      avatarUrl: photos[0].value,
      provider: 'google',
      providerId: profile.id,
    });
  }
}