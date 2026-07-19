import { StringDecoder } from "node:string_decoder";

export class BoundedOutputBuffer {
  private readonly decoder = new StringDecoder("utf8");
  private omittedCharacters = 0;
  private tail = "";

  constructor(private readonly maxCharacters: number) {
    if (!Number.isInteger(maxCharacters) || maxCharacters < 1) {
      throw new Error("La limite de sortie doit etre un entier positif.");
    }
  }

  append(chunk: Buffer | string): void {
    const value = typeof chunk === "string"
      ? `${this.decoder.end()}${chunk}`
      : this.decoder.write(chunk);
    this.appendDecoded(value);
  }

  finish(): void {
    this.appendDecoded(this.decoder.end());
  }

  private appendDecoded(value: string): void {
    if (!value) return;

    if (value.length >= this.maxCharacters) {
      this.omittedCharacters += this.tail.length + value.length - this.maxCharacters;
      this.tail = value.slice(-this.maxCharacters);
      return;
    }

    const overflow = Math.max(0, this.tail.length + value.length - this.maxCharacters);
    if (overflow > 0) {
      this.omittedCharacters += overflow;
      this.tail = this.tail.slice(overflow);
    }
    this.tail += value;
  }

  toString(): string {
    if (this.omittedCharacters === 0) return this.tail;

    const marker = `[Sortie tronquee : ${this.omittedCharacters} caracteres omis]\n`;
    if (marker.length >= this.maxCharacters) {
      return marker.slice(0, this.maxCharacters);
    }
    return marker + this.tail.slice(-(this.maxCharacters - marker.length));
  }
}
