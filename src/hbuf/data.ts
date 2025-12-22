export type FromMap = (map: Record<string, any>, tag: string) => Data

export interface Descriptor {

}

export abstract class Data {
    public abstract toMap(tag: string): Record<string, any>;
}

