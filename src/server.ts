import express from "express";
import path from "path";
import { Prisma, ProdutoTipo } from "@prisma/client";
import { prisma } from "./prisma";

const app = express();
app.use(express.json());
app.use(express.static("public"));

function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, v) => {
      if (v instanceof Prisma.Decimal) return Number(v);
      if (v instanceof Date) return v.toISOString();
      return v;
    })
  ) as T;
}

// Tela Produto - Cadastrar
app.post("/produtos", async (req, res) => {
  try {
    const { nome, preco, estoque, tipo, voltagem, dataValidade } = req.body;

    if (!nome || preco == null || estoque == null || !tipo) {
      return res.status(400).json({
        erro: "Campos obrigatorios: nome, preco, estoque, tipo",
      });
    }

    if (![ProdutoTipo.ELETRONICO, ProdutoTipo.PERECIVEL].includes(tipo)) {
      return res.status(400).json({ erro: "tipo deve ser ELETRONICO ou PERECIVEL" });
    }

    if (tipo === ProdutoTipo.ELETRONICO && !voltagem) {
      return res.status(400).json({ erro: "voltagem e obrigatoria para ELETRONICO" });
    }

    if (tipo === ProdutoTipo.PERECIVEL && !dataValidade) {
      return res.status(400).json({ erro: "dataValidade e obrigatoria para PERECIVEL" });
    }

    const criado = await prisma.$transaction(async (tx) => {
      const base = await tx.produto.create({
        data: {
          nome,
          preco: new Prisma.Decimal(preco),
          estoque: Number(estoque),
          tipo,
        },
      });

      if (tipo === ProdutoTipo.ELETRONICO) {
        await tx.produtoEletronico.create({
          data: {
            produtoId: base.id,
            voltagem: String(voltagem),
          },
        });
      }

      if (tipo === ProdutoTipo.PERECIVEL) {
        await tx.produtoPerecivel.create({
          data: {
            produtoId: base.id,
            dataValidade: new Date(dataValidade),
          },
        });
      }

      return tx.produto.findUnique({
        where: { id: base.id },
        include: { eletronico: true, perecivel: true },
      });
    });

    return res.status(201).json(toJsonSafe(criado));
  } catch (error) {
    return res.status(500).json({ erro: "Falha ao cadastrar produto", detalhe: String(error) });
  }
});

// Tela Produto - Consultar (todos)
app.get("/produtos", async (_req, res) => {
  const produtos = await prisma.produto.findMany({
    include: { eletronico: true, perecivel: true },
    orderBy: { id: "asc" },
  });

  return res.json(toJsonSafe(produtos));
});

// Tela Produto - Consultar por id
app.get("/produtos/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ erro: "id invalido" });
  }

  const produto = await prisma.produto.findUnique({
    where: { id },
    include: { eletronico: true, perecivel: true },
  });

  if (!produto) {
    return res.status(404).json({ erro: "Produto nao encontrado" });
  }

  return res.json(toJsonSafe(produto));
});

// Tela Produto - Alterar
app.put("/produtos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ erro: "id invalido" });
    }

    const existente = await prisma.produto.findUnique({
      where: { id },
      include: { eletronico: true, perecivel: true },
    });

    if (!existente) {
      return res.status(404).json({ erro: "Produto nao encontrado" });
    }

    const { nome, preco, estoque, voltagem, dataValidade } = req.body;

    const atualizado = await prisma.$transaction(async (tx) => {
      await tx.produto.update({
        where: { id },
        data: {
          nome: nome ?? existente.nome,
          preco: preco != null ? new Prisma.Decimal(preco) : existente.preco,
          estoque: estoque != null ? Number(estoque) : existente.estoque,
        },
      });

      if (existente.tipo === ProdutoTipo.ELETRONICO && voltagem != null) {
        await tx.produtoEletronico.update({
          where: { produtoId: id },
          data: { voltagem: String(voltagem) },
        });
      }

      if (existente.tipo === ProdutoTipo.PERECIVEL && dataValidade != null) {
        await tx.produtoPerecivel.update({
          where: { produtoId: id },
          data: { dataValidade: new Date(dataValidade) },
        });
      }

      return tx.produto.findUnique({
        where: { id },
        include: { eletronico: true, perecivel: true },
      });
    });

    return res.json(toJsonSafe(atualizado));
  } catch (error) {
    return res.status(500).json({ erro: "Falha ao alterar produto", detalhe: String(error) });
  }
});

// Tela Produto - Excluir
app.delete("/produtos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ erro: "id invalido" });
    }

    await prisma.produto.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ erro: "Falha ao excluir produto", detalhe: String(error) });
  }
});

// Tela Pedido - Cadastrar
app.post("/pedidos", async (req, res) => {
  try {
    const { data, itens } = req.body as {
      data?: string;
      itens?: Array<{ produtoId: number; qtde: number }>;
    };

    if (!Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ erro: "Pedido deve conter ao menos 1 item" });
    }

    const produtoIds = itens.map((i) => Number(i.produtoId));
    const produtos = await prisma.produto.findMany({
      where: { id: { in: produtoIds } },
    });

    if (produtos.length !== produtoIds.length) {
      return res.status(400).json({ erro: "Um ou mais produtos nao existem" });
    }

    const mapaProdutos = new Map(produtos.map((p) => [p.id, p]));

    const pedidoCriado = await prisma.$transaction(async (tx) => {
      const itensCalculados = itens.map((item) => {
        const produto = mapaProdutos.get(item.produtoId);
        if (!produto) throw new Error(`Produto ${item.produtoId} nao encontrado`);
        if (item.qtde <= 0) throw new Error("Quantidade deve ser maior que zero");
        if (produto.estoque < item.qtde) {
          throw new Error(`Estoque insuficiente para produto ${produto.id}`);
        }

        const valorItem = produto.preco.mul(item.qtde);
        return {
          produtoId: item.produtoId,
          qtde: item.qtde,
          valorItem,
        };
      });

      const valorTotal = itensCalculados.reduce(
        (acc, atual) => acc.add(atual.valorItem),
        new Prisma.Decimal(0)
      );

      for (const item of itensCalculados) {
        await tx.produto.update({
          where: { id: item.produtoId },
          data: { estoque: { decrement: item.qtde } },
        });
      }

      const pedido = await tx.pedido.create({
        data: {
          data: data ? new Date(data) : new Date(),
          valorTotal,
          itens: {
            create: itensCalculados.map((item) => ({
              produtoId: item.produtoId,
              qtde: item.qtde,
              valorItem: item.valorItem,
            })),
          },
        },
        include: {
          itens: {
            include: { produto: { include: { eletronico: true, perecivel: true } } },
          },
        },
      });

      return pedido;
    });

    return res.status(201).json(toJsonSafe(pedidoCriado));
  } catch (error) {
    return res.status(400).json({ erro: "Falha ao cadastrar pedido", detalhe: String(error) });
  }
});

// Tela Pedido - Consultar por id
app.get("/pedidos/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ erro: "id invalido" });
  }

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      itens: {
        include: { produto: { include: { eletronico: true, perecivel: true } } },
      },
    },
  });

  if (!pedido) {
    return res.status(404).json({ erro: "Pedido nao encontrado" });
  }

  return res.json(toJsonSafe(pedido));
});

app.get("/health", (_req, res) => {
  return res.json({ status: "ok" });
});

app.get("/", (_req, res) => {
  return res.sendFile(path.resolve(process.cwd(), "public", "index.html"));
});

const PORT = Number(process.env.PORT ?? 3000);

async function bootstrap() {
  await prisma.$connect();

  app.listen(PORT, () => {
    console.log(`Servidor iniciado em http://localhost:${PORT}`);
  });
}

bootstrap().catch(async (error) => {
  console.error("Falha ao iniciar aplicacao", error);
  await prisma.$disconnect();
  process.exit(1);
});
