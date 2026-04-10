-- DDL representativo da modelagem Prisma para MySQL
CREATE TABLE `Pedido` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `data` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `valorTotal` DECIMAL(10,2) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Produto` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(120) NOT NULL,
  `preco` DECIMAL(10,2) NOT NULL,
  `estoque` INT NOT NULL,
  `tipo` ENUM('ELETRONICO', 'PERECIVEL') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Item` (
  `codigoItem` INT NOT NULL AUTO_INCREMENT,
  `qtde` INT NOT NULL,
  `valorItem` DECIMAL(10,2) NOT NULL,
  `pedidoId` INT NOT NULL,
  `produtoId` INT NOT NULL,
  PRIMARY KEY (`codigoItem`),
  INDEX `Item_pedidoId_idx`(`pedidoId`),
  INDEX `Item_produtoId_idx`(`produtoId`),
  CONSTRAINT `Item_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `Pedido`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `Item_produtoId_fkey` FOREIGN KEY (`produtoId`) REFERENCES `Produto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProdutoEletronico` (
  `produtoId` INT NOT NULL,
  `voltagem` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`produtoId`),
  CONSTRAINT `ProdutoEletronico_produtoId_fkey` FOREIGN KEY (`produtoId`) REFERENCES `Produto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ProdutoPerecivel` (
  `produtoId` INT NOT NULL,
  `dataValidade` DATETIME(3) NOT NULL,
  PRIMARY KEY (`produtoId`),
  CONSTRAINT `ProdutoPerecivel_produtoId_fkey` FOREIGN KEY (`produtoId`) REFERENCES `Produto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
