const NativeWebSocket = window.WebSocket;
const HMR_PROTOCOL = "vite-hmr";

class ResilientViteHmrSocket extends EventTarget {
	private reconnectAttempts = 0;
	private reconnectTimer: number | undefined;
	private socket: WebSocket;
	private shouldReconnect = true;

	onclose: ((event: CloseEvent) => void) | null = null;
	onerror: ((event: Event) => void) | null = null;
	onmessage: ((event: MessageEvent) => void) | null = null;
	onopen: ((event: Event) => void) | null = null;
	readonly CLOSED = NativeWebSocket.CLOSED;
	readonly CLOSING = NativeWebSocket.CLOSING;
	readonly CONNECTING = NativeWebSocket.CONNECTING;
	readonly OPEN = NativeWebSocket.OPEN;

	constructor(
		readonly url: string,
		readonly protocols?: string | string[],
	) {
		super();
		this.socket = this.connect();
		document.addEventListener("visibilitychange", this.handleVisibilityChange);
	}

	get binaryType() {
		return this.socket.binaryType;
	}

	set binaryType(value: BinaryType) {
		this.socket.binaryType = value;
	}

	get bufferedAmount() {
		return this.socket.bufferedAmount;
	}

	get extensions() {
		return this.socket.extensions;
	}

	get protocol() {
		return this.socket.protocol;
	}

	get readyState() {
		return this.socket.readyState;
	}

	close(code?: number, reason?: string) {
		this.shouldReconnect = false;
		window.clearTimeout(this.reconnectTimer);
		document.removeEventListener("visibilitychange", this.handleVisibilityChange);
		this.socket.close(code, reason);
	}

	send(data: Parameters<WebSocket["send"]>[0]) {
		if (this.socket.readyState === NativeWebSocket.OPEN) this.socket.send(data);
	}

	private connect() {
		const socket = new NativeWebSocket(this.url, this.protocols);
		socket.binaryType = "blob";
		socket.addEventListener("open", () => {
			this.reconnectAttempts = 0;
			this.emit("open", new Event("open"));
		});
		socket.addEventListener("message", event =>
			this.emit("message", new MessageEvent("message", { data: event.data })),
		);
		socket.addEventListener("error", () => this.emit("error", new Event("error")));
		socket.addEventListener("close", () => {
			if (!this.shouldReconnect) return;

			// Chrome pauses installed apps in the background and may close the HMR
			// socket. Vite treats any close as a server restart and reloads the page.
			this.scheduleReconnect();
		});
		return socket;
	}

	private emit(type: "close" | "error" | "message" | "open", event: Event) {
		this.dispatchEvent(event);
		if (type === "error") this.onerror?.(event);
		if (type === "message") this.onmessage?.(event as MessageEvent);
		if (type === "open") this.onopen?.(event);
		if (type === "close") this.onclose?.(event as CloseEvent);
	}

	private handleVisibilityChange = () => {
		if (document.visibilityState === "visible" && this.socket.readyState !== NativeWebSocket.OPEN) {
			this.scheduleReconnect(0);
		}
	};

	private scheduleReconnect(delay = Math.min(1_000 * 2 ** this.reconnectAttempts++, 30_000)) {
		if (document.visibilityState !== "visible" || this.reconnectTimer || !this.shouldReconnect) return;
		this.reconnectTimer = window.setTimeout(() => {
			this.reconnectTimer = undefined;
			if (this.socket.readyState !== NativeWebSocket.OPEN && this.shouldReconnect)
				this.socket = this.connect();
		}, delay);
	}
}

window.WebSocket = new Proxy(NativeWebSocket, {
	construct(Target, argumentsList: [string, string | string[] | undefined]) {
		const [url, protocols] = argumentsList;
		const usesViteHmr = Array.isArray(protocols)
			? protocols.includes(HMR_PROTOCOL)
			: protocols === HMR_PROTOCOL;
		return usesViteHmr
			? new ResilientViteHmrSocket(url, protocols)
			: Reflect.construct(Target, argumentsList);
	},
}) as typeof WebSocket;
