export interface Data {
    toData(): Blob | ArrayBuffer;
    toJson(): Record<string, any>;
}
