import { Data } from "../hbuf/data";
export declare enum RpcType {
    Request = 0,
    Response = 1,
    Broadcast = 2,
    Heartbeat = 3,
    AuthSuccess = 4,
    AuthFailure = 5
}
export declare class Context {
}
export declare class Result implements Data {
    constructor(code: number, msg: string);
    code: number;
    msg: string;
    data?: Data | void;
    toData(): Blob | ArrayBuffer;
    toJson(): Record<string, any>;
}
export declare class RpcData {
    constructor(type: RpcType, id: number, path: string, status: number);
    type: RpcType;
    header: Record<string, string[]>;
    data?: Data | null;
    id: number;
    path: string;
    status: number;
    toJson(): Record<string, any>;
}
export interface Client {
    invoke<T>(serverName: string, serverId: number, name: string, id: number, req: Data | Blob | ArrayBuffer, fromJson: ((json: {}) => T) | null, fromData: ((json: ArrayBuffer) => T) | null): Promise<T>;
}
export declare abstract class ServerClient {
    get client(): Client;
    abstract get name(): string;
    abstract get id(): number;
    private readonly _client;
    protected invoke<T>(name: string, id: number, req: Data | Blob | ArrayBuffer, fromJson: ((json: {}) => T) | null, fromData: ((json: ArrayBuffer) => T) | null): Promise<T>;
    protected constructor(client: Client);
}
export interface ServerInvoke {
    formData(buf: Blob | ArrayBuffer | Record<string, any>): Data | Blob | ArrayBuffer;
    toData(data: Data): Blob | ArrayBuffer | Record<string, any>;
    invoke(data: Data | Blob | ArrayBuffer, ctx?: Context): Promise<Data | Blob | ArrayBuffer | void>;
}
export interface ServerRouter {
    getName(): string;
    getId(): number;
    getInvoke(): Record<string, ServerInvoke>;
}
export declare class Server {
    protected router: Record<string, ServerInvoke>;
    addRouter(router: ServerRouter): void;
    deleteRouter(router: ServerRouter): void;
    invoke(request: RpcData): Promise<RpcData>;
}
