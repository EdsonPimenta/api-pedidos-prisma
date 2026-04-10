const apiStatus = document.getElementById("apiStatus");
const responseBox = document.getElementById("responseBox");
const productForm = document.getElementById("productForm");
const productType = document.getElementById("productType");
const voltagemField = document.getElementById("voltagemField");
const validadeField = document.getElementById("validadeField");
const productGrid = document.getElementById("productGrid");
const pedidoForm = document.getElementById("pedidoForm");
const pedidoProduto = document.getElementById("pedidoProduto");
const pedidoQtde = document.getElementById("pedidoQtde");
const addItemButton = document.getElementById("addItemButton");
const clearItemsButton = document.getElementById("clearItemsButton");
const itemsList = document.getElementById("itemsList");

let pedidoItens = [];
let produtosCache = [];

function showResponse(payload) {
  responseBox.textContent = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function renderProductCards(produtos) {
  if (!produtos.length) {
    productGrid.innerHTML = '<p style="color:#98a8c7;margin:0;">Nenhum produto cadastrado ainda.</p>';
    return;
  }

  productGrid.innerHTML = produtos
    .map((produto) => {
      const detalhe =
        produto.tipo === "ELETRONICO"
          ? `Voltagem: ${produto.eletronico?.voltagem ?? "-"}`
          : `Validade: ${produto.perecivel?.dataValidade ? new Date(produto.perecivel.dataValidade).toLocaleDateString("pt-BR") : "-"}`;

      return `
        <article class="product-card">
          <h3>#${produto.id} - ${produto.nome}</h3>
          <p>Tipo: ${produto.tipo}</p>
          <p>Preço: ${formatCurrency(produto.preco)}</p>
          <p>Estoque: ${produto.estoque}</p>
          <p>${detalhe}</p>
        </article>
      `;
    })
    .join("");
}

function renderPedidoItems() {
  if (!pedidoItens.length) {
    itemsList.innerHTML = '<li><span>Nenhum item adicionado.</span><span>0 itens</span></li>';
    return;
  }

  itemsList.innerHTML = pedidoItens
    .map(
      (item, index) => `
      <li>
        <span>#${item.produtoId} - ${item.nome} | Qtde: ${item.qtde}</span>
        <button type="button" data-index="${index}">Remover</button>
      </li>
    `
    )
    .join("");
}

async function loadProducts() {
  const response = await fetch("/produtos");
  const produtos = await response.json();
  produtosCache = produtos;

  renderProductCards(produtos);

  pedidoProduto.innerHTML = produtos
    .map((produto) => `<option value="${produto.id}">${produto.id} - ${produto.nome} (${produto.estoque} em estoque)</option>`)
    .join("");

  apiStatus.textContent = `Conectado com ${produtos.length} produto(s) carregado(s).`;
}

productType.addEventListener("change", () => {
  const isEletronico = productType.value === "ELETRONICO";
  voltagemField.hidden = !isEletronico;
  validadeField.hidden = isEletronico;
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(productForm);
  const payload = {
    nome: formData.get("nome"),
    preco: Number(formData.get("preco")),
    estoque: Number(formData.get("estoque")),
    tipo: formData.get("tipo"),
    voltagem: formData.get("voltagem"),
    dataValidade: formData.get("dataValidade") ? new Date(`${formData.get("dataValidade")}T00:00:00`).toISOString() : null,
  };

  const response = await fetch("/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  showResponse(data);

  if (response.ok) {
    productForm.reset();
    productType.dispatchEvent(new Event("change"));
    await loadProducts();
  }
});

addItemButton.addEventListener("click", () => {
  const produtoId = Number(pedidoProduto.value);
  const qtde = Number(pedidoQtde.value);
  const produto = produtosCache.find((item) => item.id === produtoId);

  if (!produto) {
    showResponse({ erro: "Selecione um produto válido." });
    return;
  }

  if (!qtde || qtde <= 0) {
    showResponse({ erro: "Informe uma quantidade maior que zero." });
    return;
  }

  pedidoItens.push({ produtoId, qtde, nome: produto.nome });
  renderPedidoItems();
  showResponse({ mensagem: "Item adicionado ao pedido.", itens: pedidoItens });
});

clearItemsButton.addEventListener("click", () => {
  pedidoItens = [];
  renderPedidoItems();
  showResponse("Itens do pedido limpos.");
});

itemsList.addEventListener("click", (event) => {
  const target = event.target;
  if (target.tagName !== "BUTTON") return;

  const index = Number(target.dataset.index);
  pedidoItens.splice(index, 1);
  renderPedidoItems();
});

pedidoForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!pedidoItens.length) {
    showResponse({ erro: "Adicione pelo menos 1 item ao pedido." });
    return;
  }

  const formData = new FormData(pedidoForm);
  const payload = {
    data: formData.get("data") ? new Date(String(formData.get("data"))).toISOString() : undefined,
    itens: pedidoItens.map(({ produtoId, qtde }) => ({ produtoId, qtde })),
  };

  const response = await fetch("/pedidos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  showResponse(data);

  if (response.ok) {
    pedidoItens = [];
    renderPedidoItems();
    await loadProducts();
  }
});

renderPedidoItems();
productType.dispatchEvent(new Event("change"));
loadProducts().catch((error) => {
  apiStatus.textContent = "Falha ao conectar na API.";
  showResponse({ erro: String(error) });
});
