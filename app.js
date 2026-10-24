
const STORAGE_KEY = 'prime_acai_cart';

let cart = loadCart();

const brl = value =>
    Number(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

/* AVISOS */

function toast(message) {
    const el = $('#toast');

    if (!el) {
        console.log(message);
        return;
    }

    el.textContent = message;
    el.classList.add('show');

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
        el.classList.remove('show');
    }, 2400);
}

/* PERSISTÊNCIA DO CARRINHO */

function loadCart() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) return [];

        const items = JSON.parse(saved);

        if (!Array.isArray(items)) return [];

        return items
            .filter(item =>
                item &&
                typeof item.id === 'string' &&
                typeof item.name === 'string' &&
                Number.isFinite(Number(item.price)) &&
                Number(item.price) >= 0
            )
            .map(item => ({
                id: item.id,
                name: item.name,
                price: Number(item.price),
                details: String(item.details || ''),
                quantity: Math.max(
                    1,
                    Math.floor(Number(item.quantity) || 1)
                )
            }));
    } catch (error) {
        console.error('Erro ao carregar o carrinho:', error);
        return [];
    }
}

function saveCart() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
        console.error('Erro ao salvar o carrinho:', error);
        toast('Não foi possível salvar o carrinho neste navegador.');
    }
}

/* CÁLCULOS */

function getCartCount() {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function getCartTotal() {
    return cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    );
}



/* ENTREGA E RESUMO FINANCEIRO */

// Valor ilustrativo: altere para a taxa real da loja.
const DELIVERY_FEE = 0;

function getDeliveryType() {
    return $('input[name="deliveryType"]:checked')?.value || 'entrega';
}

function getDeliveryFee() {
    return getDeliveryType() === 'entrega' ? DELIVERY_FEE : 0;
}

function updateCheckoutOptions() {
    const deliveryFields = $('#delivery-fields');
    const address = $('#address');
    const neighborhood = $('#neighborhood');
    const payment = $('#payment');
    const changeFields = $('#change-fields');
    const changeFor = $('#changeFor');

    const isDelivery = getDeliveryType() === 'entrega';
    const isCash = payment?.value === 'Dinheiro';

    deliveryFields?.classList.toggle('hidden', !isDelivery);

    if (address) address.required = isDelivery;
    if (neighborhood) neighborhood.required = isDelivery;

    changeFields?.classList.toggle('hidden', !isCash);

    if (changeFor) {
        changeFor.required = false;

        if (!isCash) {
            changeFor.value = '';
        }
    }

    updateCheckoutSummary();
}

function updateCheckoutSummary() {
    const subtotal = getCartTotal();
    const delivery = getDeliveryFee();
    const total = subtotal + delivery;

    if ($('#summary-subtotal')) {
        $('#summary-subtotal').textContent = brl(subtotal);
    }

    if ($('#summary-delivery')) {
        $('#summary-delivery').textContent =
            delivery === 0 && getDeliveryType() === 'retirada'
                ? 'Grátis'
                : brl(delivery);
    }

    if ($('#summary-total')) {
        $('#summary-total').textContent = brl(total);
    }

    if ($('#checkout-total')) {
        $('#checkout-total').textContent = brl(total);
    }
}

$$('input[name="deliveryType"]').forEach(input => {
    input.addEventListener('change', updateCheckoutOptions);
});

$('#payment')?.addEventListener('change', updateCheckoutOptions);


/* CÁLCULO DO COPO PERSONALIZADO */

function updateBuilderPrice() {
    const size = $('input[name="size"]:checked');
    const priceElement = $('#builder-price');

    if (!size || !priceElement) return;

    const base = Number(size.dataset.price) || 0;

    const extras = $$('.ingredient:checked').reduce(
        (sum, input) => sum + (Number(input.dataset.price) || 0),
        0
    );

    priceElement.textContent = brl(base + extras);
}

$$('input[name="size"], .ingredient').forEach(input => {
    input.addEventListener('change', updateBuilderPrice);
});

/* ADICIONAR AO CARRINHO */

function addToCart(name, price, details = '') {
    const numericPrice = Number(price);

    if (!name || !Number.isFinite(numericPrice) || numericPrice < 0) {
        toast('Não foi possível adicionar este produto.');
        return;
    }

    cart.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        price: numericPrice,
        details,
        quantity: 1
    });

    saveCart();
    renderCart();

    toast(`${name} adicionado ao pedido!`);
}

/* PRODUTOS PRONTOS */

$$('.add-product').forEach(button => {
    button.addEventListener('click', () => {
        addToCart(
            button.dataset.name,
            Number(button.dataset.price),
            'Conforme descrição do cardápio'
        );
    });
});

/* COPO PERSONALIZADO */

const addCustomButton = $('#add-custom');

if (addCustomButton) {
    addCustomButton.addEventListener('click', () => {
        const size = $('input[name="size"]:checked');

        if (!size) {
            toast('Selecione o tamanho do copo.');
            return;
        }

        const extras = $$('.ingredient:checked');
        const base = Number(size.dataset.price) || 0;

        const extraTotal = extras.reduce(
            (sum, input) => sum + (Number(input.dataset.price) || 0),
            0
        );

        const details = extras.length
            ? `Adicionais: ${extras.map(input => input.value).join(', ')}`
            : 'Sem adicionais';

        addToCart(
            `Açaí personalizado ${size.value} ml`,
            base + extraTotal,
            details
        );
    });
}

/* ALTERAR QUANTIDADE E REMOVER PRODUTOS */

function changeQuantity(id, amount) {
    const item = cart.find(entry => entry.id === id);

    if (!item) return;

    item.quantity += amount;

    if (item.quantity <= 0) {
        const index = cart.findIndex(entry => entry.id === id);

        if (index !== -1) {
            cart.splice(index, 1);
        }
    }

    saveCart();
    renderCart();
}

function removeFromCart(id) {
    const index = cart.findIndex(item => item.id === id);

    if (index === -1) return;

    cart.splice(index, 1);

    saveCart();
    renderCart();

    toast('Produto removido do carrinho.');
}

/* ATUALIZAR CARRINHO */

function renderCart() {
    const count = getCartCount();
    const total = getCartTotal();

    updateCheckoutSummary();

    const countElement = $('#cart-count');
    const barCount = $('#bar-count');
    const barTotal = $('#bar-total');
    const checkoutTotal = $('#checkout-total');
    const cartBar = $('#cart-bar');
    const container = $('#cart-items');

    if (countElement) {
        countElement.textContent = count;
    }

    if (barCount) {
        barCount.textContent =
            `${count} ${count === 1 ? 'item' : 'itens'}`;
    }

    if (barTotal) {
        barTotal.textContent = brl(total);
    }

    if (checkoutTotal) {
        checkoutTotal.textContent = brl(total);
    }

    if (cartBar) {
        cartBar.classList.toggle('hidden', count === 0);
    }

    if (!container) return;

    container.innerHTML = '';

    if (cart.length === 0) {
        const empty = document.createElement('p');

        empty.className = 'cart-empty';
        empty.textContent =
            'Seu carrinho está vazio. Escolha algo gostoso no cardápio!';

        container.appendChild(empty);
        return;
    }

    cart.forEach(item => {
        const row = document.createElement('article');
        row.className = 'cart-item';

        const info = document.createElement('div');
        info.className = 'cart-item-info';

        const title = document.createElement('h4');
        title.textContent = item.name;

        const details = document.createElement('p');
        details.textContent = item.details;

        const price = document.createElement('strong');
        price.textContent = brl(item.price * item.quantity);

        const unitPrice = document.createElement('small');
        unitPrice.textContent = `${brl(item.price)} por unidade`;

        const controls = document.createElement('div');
        controls.className = 'quantity-control';

        const decrease = document.createElement('button');
        decrease.type = 'button';
        decrease.className = 'quantity-btn';
        decrease.textContent = '−';
        decrease.setAttribute('aria-label', `Diminuir ${item.name}`);

        decrease.addEventListener('click', () => {
            changeQuantity(item.id, -1);
        });

        const quantity = document.createElement('span');
        quantity.className = 'quantity-value';
        quantity.textContent = item.quantity;
        quantity.setAttribute('aria-label', 'Quantidade');

        const increase = document.createElement('button');
        increase.type = 'button';
        increase.className = 'quantity-btn';
        increase.textContent = '+';
        increase.setAttribute('aria-label', `Aumentar ${item.name}`);

        increase.addEventListener('click', () => {
            changeQuantity(item.id, 1);
        });

        controls.append(decrease, quantity, increase);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'remove-item';
        remove.textContent = 'Remover';

        remove.addEventListener('click', () => {
            removeFromCart(item.id);
        });

        info.append(title, details, unitPrice, controls, remove);
        row.append(info, price);

        container.appendChild(row);
    });
}

/* ABRIR E FECHAR O PEDIDO */

function openCart() {
    if (cart.length === 0) {
        toast('Adicione pelo menos um item antes de continuar.');
        return;
    }

    $('#cart-overlay')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    $('#cart-overlay')?.classList.add('hidden');
    document.body.style.overflow = '';
}

$('#open-cart')?.addEventListener('click', openCart);
$('#view-order')?.addEventListener('click', openCart);
$('#close-cart')?.addEventListener('click', closeCart);

$('#cart-overlay')?.addEventListener('click', event => {
    if (event.target === $('#cart-overlay')) {
        closeCart();
    }
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        closeCart();
    }
});

/* FINALIZAR PEDIDO */


/* FINALIZAR PEDIDO */

const checkoutForm = $('#checkout-form');

if (checkoutForm) {
    checkoutForm.addEventListener('submit', event => {
        event.preventDefault();

        if (cart.length === 0) {
            toast('Seu pedido está vazio.');
            return;
        }

        updateCheckoutOptions();

        if (!checkoutForm.reportValidity()) {
            return;
        }

        const form = new FormData(checkoutForm);

        const customer = String(form.get('customer') || '').trim();
        const phone = String(form.get('phone') || '').trim();
        const address = String(form.get('address') || '').trim();
        const neighborhood = String(form.get('neighborhood') || '').trim();
        const complement = String(form.get('complement') || '').trim();
        const payment = String(form.get('payment') || '').trim();
        const notes = String(form.get('notes') || '').trim();
        const deliveryType = getDeliveryType();
        const changeFor = String(form.get('changeFor') || '').trim();

        const subtotal = getCartTotal();
        const deliveryFee = getDeliveryFee();
        const total = subtotal + deliveryFee;

        const lines = cart.map((item, index) => [
            `${index + 1}. ${item.name}`,
            `   Quantidade: ${item.quantity}`,
            `   Unitário: ${brl(item.price)}`,
            `   Subtotal: ${brl(item.price * item.quantity)}`,
            `   ${item.details}`
        ].join('\n'));

        const message = [
            '*💜 NOVO PEDIDO — PRIME AÇAÍ*',
            '',
            ...lines,
            '',
            `Subtotal dos produtos: ${brl(subtotal)}`,
            `Taxa de entrega: ${brl(deliveryFee)}`,
            `*TOTAL DO PEDIDO: ${brl(total)}*`,
            '',
            '*DADOS DO CLIENTE*',
            `Nome: ${customer}`,
            `Telefone: ${phone}`,
            `Recebimento: ${deliveryType === 'entrega' ? 'Entrega' : 'Retirada no local'}`,
            deliveryType === 'entrega' ? `Endereço: ${address}` : '',
            deliveryType === 'entrega' ? `Bairro: ${neighborhood}` : '',
            deliveryType === 'entrega' && complement
                ? `Complemento: ${complement}`
                : '',
            `Pagamento: ${payment}`,
            payment === 'Dinheiro' && changeFor
                ? `Troco para: ${brl(Number(changeFor))}`
                : '',
            notes ? `Observações: ${notes}` : '',
            '',
            'Olá! Gostaria de confirmar este pedido.'
        ].filter(Boolean).join('\n');

        // Confirme que este é o número oficial da loja.
        const whatsappNumber = '5579988342388';

        const url =
            `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

        window.open(url, '_blank', 'noopener,noreferrer');
    });
}


/* INICIALIZAÇÃO */

updateBuilderPrice();
updateCheckoutOptions();
renderCart();
