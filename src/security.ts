import { NotImplementedError } from "./errors";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
dotenv.config();

export async function hashPassword(password: string) {
  const hashPass = bcrypt.hash(password, 10);
  const pass: string = await hashPass;
  return pass;
}

export function generateToken(data: TokenData): string {
  //throw new NotImplementedError('TOKEN_GENERATION_NOT_IMPLEMENTED_YET');
  const payload: JwtPayload = {
    id: data.id
  }
  const secretKey = process.env.TOKEN_SECRET_KEY!
  const accessToken = jwt.sign(payload, secretKey, {
    expiresIn: '30d'
  });
  return accessToken;
}

export function isValidToken(token: string): boolean {
  //throw new NotImplementedError('TOKEN_VALIDATION_NOT_IMPLEMENTED_YET');
  const secretKey = process.env.TOKEN_SECRET_KEY!
  const payload = jwt.verify(token, secretKey);
  console.log(payload);
  if (payload) {
    return true;
  } else {
    return false;
  }
}

export function extraDataFromToken(token: string): TokenData {
  const secretKey = process.env.TOKEN_SECRET_KEY!
  const { id } = jwt.verify(token, secretKey) as JwtPayload;
  const data: TokenData = {
    id: id,
  }
  return data;
}

export interface TokenData {
  id: number;
}

interface JwtPayload {
  id: number;
}