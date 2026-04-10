# Prototipo UML -> Node.js + TypeScript + Prisma + MySQL

Este projeto implementa um prototipo baseado no diagrama de classes informado:

- Pedido (1..*) Item
- Item (1..1) Produto
- Produto com especializacoes: ProdutoEletronico e ProdutoPerecivel
- Tela Produto e Tela Pedido representadas por endpoints REST JSON

## Estrategia de heranca usada no ORM

Foi adotada a estrategia **Table-per-Type (TPT)**:

- Tabela base `Produto` para atributos comuns (`id`, `nome`, `preco`, `estoque`, `tipo`)
- Tabela `ProdutoEletronico` para `voltagem`
- Tabela `ProdutoPerecivel` para `dataValidade`

Motivos da escolha:

- Evita excesso de colunas nulas de uma abordagem Single Table.
- Mantem integridade relacional e separa claramente dados especificos por subtipo.
- Facilita evolucao futura com novos tipos de produto sem inflar a tabela base.

## Arquivos principais

- `prisma/schema.prisma`: modelagem ORM
- `prisma/mysql-ddl.sql`: DDL equivalente para MySQL
- `src/server.ts`: endpoints de Produto e Pedido (JSON)
- `public/index.html`: front-end
- `public/app.js`: logica da interface
- `public/styles.css`: visual da interface

## Como executar

1. Instale dependencias:

   npm install

2. Crie o arquivo `.env` com base em `.env.example`.

3. Gere o client do Prisma:

   npm run prisma:generate

4. Crie as tabelas no banco:

   npm run prisma:migrate -- --name init

5. Suba a API:

   npm run dev

## Endpoints (Tela Produto)

- POST /produtos -> Cadastrar
- GET /produtos -> Consultar todos
- GET /produtos/:id -> Consultar por id
- PUT /produtos/:id -> Alterar
- DELETE /produtos/:id -> Excluir

### Exemplo de cadastro de produto eletronico

```bash
curl -X POST http://localhost:3000/produtos \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Notebook X",
    "preco": 4999.90,
    "estoque": 20,
    "tipo": "ELETRONICO",
    "voltagem": "110V"
  }'
```

### Exemplo de cadastro de produto perecivel

```bash
curl -X POST http://localhost:3000/produtos \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Iogurte Natural",
    "preco": 8.50,
    "estoque": 100,
    "tipo": "PERECIVEL",
    "dataValidade": "2026-12-31T00:00:00.000Z"
  }'
```

## Endpoints (Tela Pedido)

- POST /pedidos -> Cadastrar (com itens)
- GET /pedidos/:id -> Consultar

### Exemplo de cadastro de pedido

```bash
curl -X POST http://localhost:3000/pedidos \
  -H "Content-Type: application/json" \
  -d '{
    "itens": [
      { "produtoId": 1, "qtde": 2 },
      { "produtoId": 2, "qtde": 3 }
    ]
  }'
```

## Regras implementadas no prototipo

- Pedido exige ao menos 1 item (restricao 1..* aplicada na camada de aplicacao).
- Item referencia exatamente 1 produto (FK obrigatoria).
- Cadastro de pedido valida existencia de produtos e estoque disponivel.
- Valor do item e valor total do pedido sao calculados no backend.
- Atualizacao de estoque acontece na mesma transacao do pedido.
