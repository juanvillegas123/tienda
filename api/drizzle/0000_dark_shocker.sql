CREATE TABLE `administradora` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`usuario` text NOT NULL,
	`contrasena_cifrada` text NOT NULL,
	`intentos_fallidos` integer DEFAULT 0 NOT NULL,
	`bloqueada_hasta` integer,
	`fecha_creacion` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `administradora_usuario_unique` ON `administradora` (`usuario`);--> statement-breakpoint
CREATE TABLE `cajas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`administradora_id` integer NOT NULL,
	`fecha_apertura` integer DEFAULT (unixepoch()) NOT NULL,
	`fecha_cierre` integer,
	`monto_inicial_centavos` integer NOT NULL,
	`efectivo_esperado_centavos` integer,
	`efectivo_contado_centavos` integer,
	`diferencia_centavos` integer,
	`estado` text DEFAULT 'ABIERTA' NOT NULL,
	FOREIGN KEY (`administradora_id`) REFERENCES `administradora`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `categorias` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`slug` text NOT NULL,
	`activa` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categorias_slug_unique` ON `categorias` (`slug`);--> statement-breakpoint
CREATE TABLE `detalle_devolucion` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`devolucion_id` integer NOT NULL,
	`producto_id` integer NOT NULL,
	`cantidad` integer NOT NULL,
	FOREIGN KEY (`devolucion_id`) REFERENCES `devoluciones`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `detalle_pedido` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pedido_id` integer NOT NULL,
	`producto_id` integer NOT NULL,
	`cantidad` integer NOT NULL,
	`precio_centavos` integer NOT NULL,
	`nota_cliente` text,
	FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `detalle_venta` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`venta_id` integer NOT NULL,
	`producto_id` integer NOT NULL,
	`cantidad` integer NOT NULL,
	`precio_centavos` integer NOT NULL,
	`costo_centavos` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `devoluciones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`venta_id` integer NOT NULL,
	`caja_id` integer NOT NULL,
	`motivo` text NOT NULL,
	`monto_centavos` integer NOT NULL,
	`fecha` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`caja_id`) REFERENCES `cajas`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `imagenes_producto` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`producto_id` integer NOT NULL,
	`url` text NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `movimientos_inventario` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`producto_id` integer NOT NULL,
	`proveedor_id` integer,
	`tipo` text NOT NULL,
	`cantidad` integer NOT NULL,
	`tipo_referencia` text,
	`id_referencia` integer,
	`nota` text,
	`fecha` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pedidos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`codigo` text NOT NULL,
	`nombre_cliente` text,
	`telefono_cliente` text,
	`total_centavos` integer NOT NULL,
	`estado` text DEFAULT 'PENDIENTE' NOT NULL,
	`fecha_creacion` integer DEFAULT (unixepoch()) NOT NULL,
	`fecha_confirmacion` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pedidos_codigo_unique` ON `pedidos` (`codigo`);--> statement-breakpoint
CREATE TABLE `productos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`categoria_id` integer NOT NULL,
	`proveedor_id` integer,
	`nombre` text NOT NULL,
	`descripcion` text,
	`precio_centavos` integer NOT NULL,
	`costo_centavos` integer DEFAULT 0 NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`escala` text,
	`nota_talla` text,
	`imagen_principal` text,
	`activo` integer DEFAULT true NOT NULL,
	`fecha_creacion` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`categoria_id`) REFERENCES `categorias`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`proveedor_id`) REFERENCES `proveedores`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `proveedores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nombre` text NOT NULL,
	`contacto` text,
	`telefono` text,
	`correo` text,
	`activo` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ventas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`caja_id` integer,
	`pedido_id` integer,
	`administradora_id` integer NOT NULL,
	`canal` text NOT NULL,
	`metodo_pago` text NOT NULL,
	`total_centavos` integer NOT NULL,
	`fecha` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`caja_id`) REFERENCES `cajas`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pedido_id`) REFERENCES `pedidos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`administradora_id`) REFERENCES `administradora`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ventas_pedido_id_unique` ON `ventas` (`pedido_id`);