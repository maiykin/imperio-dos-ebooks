// ============================================================
// ESTADO
// ============================================================
let produtos = [];      // só os ebooks à venda (loja)
let todosEbooks = [];   // todos, inclusive ocultos (painel admin)

// ============================================================
// AUTENTICAÇÃO
// ============================================================
function alternarSenha(id, botao){
  const campo = document.getElementById(id);
  const mostrando = campo.type === "text";
  campo.type = mostrando ? "password" : "text";
  botao.textContent = mostrando ? "👁" : "🙈";
}

function mostrarTab(tab){
  document.getElementById("tabLogin").classList.toggle("active", tab === "login");
  document.getElementById("tabCadastro").classList.toggle("active", tab === "cadastro");
  document.getElementById("formLogin").style.display = tab === "login" ? "flex" : "none";
  document.getElementById("formCadastro").style.display = tab === "cadastro" ? "flex" : "none";
}

async function fazerCadastro(event){
  event.preventDefault();
  const email = document.getElementById("cadEmail").value.trim();
  const telefone = document.getElementById("cadTelefone").value.trim();
  const senha = document.getElementById("cadSenha").value;
  const msg = document.getElementById("cadMsg");
  msg.textContent = "Criando conta...";

  const { error } = await supabaseClient.auth.signUp({
    email,
    password: senha,
    options: { data: { telefone } }
  });

  if(error){
    msg.textContent = error.message;
  } else {
    msg.textContent = "Conta criada! Verifique seu e-mail se for pedido, depois faça login.";
    mostrarTab("login");
  }
  return false;
}

async function fazerLogin(event){
  event.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const senha = document.getElementById("loginSenha").value;
  const msg = document.getElementById("loginMsg");
  msg.textContent = "Entrando...";

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });

  if(error){
    msg.textContent = error.message;
  }
  return false;
}

async function sair(){
  await supabaseClient.auth.signOut();
}

async function loginComGoogle(){
  await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + window.location.pathname }
  });
}

function abrirPerfil(){
  document.getElementById("perfilView").style.display = "flex";
  carregarCompras();
}

function fecharPerfil(){
  document.getElementById("perfilView").style.display = "none";
}

function nomeAPartirDoEmail(email){
  const parte = email.split("@")[0] || "";
  return parte
    .replace(/[._]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

async function carregarCompras(){
  const lista = document.getElementById("listaComprados");
  lista.innerHTML = `<p class="avatar-vazio">Carregando...</p>`;

  const { data: { session } } = await supabaseClient.auth.getSession();
  if(!session) return;

  const { data, error } = await supabaseClient
    .from("compras")
    .select("ebook_id, ebooks(titulo)")
    .eq("user_email", session.user.email)
    .eq("status", "pago");

  if(error || !data || data.length === 0){
    lista.innerHTML = `<p class="avatar-vazio">Nenhum ebook comprado ainda.</p>`;
    return;
  }

  lista.innerHTML = data.map(c => `
    <div class="item-comprado" style="display:flex;justify-content:space-between;align-items:center;gap:10px">
      <span>📘 ${c.ebooks?.titulo || "Ebook"}</span>
      <button class="comprar-btn" onclick="baixarEbook(${c.ebook_id}, this)">Baixar</button>
    </div>`).join("");
}

async function baixarEbook(ebookId, botao){
  const textoOriginal = botao.textContent;
  botao.textContent = "Gerando...";
  botao.disabled = true;

  const { data, error } = await supabaseClient.functions.invoke("baixar-ebook", {
    body: { ebookId }
  });

  if(error || !data || data.error){
    botao.textContent = "Erro";
    alert(data?.error || "Não foi possível baixar agora. Tente de novo.");
  } else {
    window.location.href = data.url;
    botao.textContent = "Baixando ✓";
  }
  setTimeout(() => { botao.textContent = textoOriginal; botao.disabled = false; }, 2500);
}

function aoMudarSessao(session){
  const gate = document.getElementById("authGate");
  const app = document.getElementById("app");
  const btnPublicar = document.getElementById("btnPublicar");

  if(session){
    gate.style.display = "none";
    app.style.display = "block";
    const ehAdmin = session.user.email === ADMIN_EMAIL;
    btnPublicar.style.display = ehAdmin ? "inline-block" : "none";
    document.getElementById("btnAdmin").style.display = ehAdmin ? "inline-block" : "none";

    const email = session.user.email || "";
    const telefone = session.user.user_metadata?.telefone;
    const inicial = email.charAt(0).toUpperCase();

    document.getElementById("avatarBtn").textContent = inicial;
    document.getElementById("avatarBtnGrande").textContent = inicial;
    document.getElementById("perfilNome").textContent = nomeAPartirDoEmail(email);
    document.getElementById("perfilEmail").textContent = email;
    document.getElementById("perfilTelefone").textContent = telefone ? `📱 ${telefone}` : "Telefone não informado";

    carregarProdutos();
  } else {
    gate.style.display = "flex";
    app.style.display = "none";
  }
}

supabaseClient.auth.onAuthStateChange((_event, session) => aoMudarSessao(session));
supabaseClient.auth.getSession().then(({ data: { session } }) => aoMudarSessao(session));

// ============================================================
// PRODUTOS (EBOOKS)
// ============================================================
const CORES_CATEGORIA = {
  negocios: "linear-gradient(135deg,#8B5CF6,#FF3E7F)",
  financas: "linear-gradient(135deg,#FFD23F,#FF3E7F)",
  pessoal: "linear-gradient(135deg,#34D399,#38BDF8)",
  saude: "linear-gradient(135deg,#34D399,#FFD23F)",
  tech: "linear-gradient(135deg,#38BDF8,#8B5CF6)",
  criativo: "linear-gradient(135deg,#F472B6,#8B5CF6)",
  familia: "linear-gradient(135deg,#FB923C,#FFD23F)",
  educacao: "linear-gradient(135deg,#8B5CF6,#38BDF8)",
  ficcao: "linear-gradient(135deg,#F472B6,#FF3E7F)",
  renda: "linear-gradient(135deg,#FF3E7F,#8B5CF6)"
};
const EMOJI_CATEGORIA = {
  negocios:"💼", financas:"💰", pessoal:"🌱", saude:"🍏", tech:"💻",
  criativo:"🎨", familia:"🏠", educacao:"📚", ficcao:"🎭", renda:"🚀"
};

const gridProdutos = document.getElementById("gridProdutos");

function formatarPreco(v){
  return Number(v).toFixed(2).replace(".", ",");
}

async function carregarProdutos(){
  document.getElementById("contadorEbooks").textContent = "carregando ebooks...";
  const { data, error } = await supabaseClient
    .from("ebooks")
    .select("id,titulo,categoria,preco,preco_antigo,criado_em,ativo")
    .order("criado_em", { ascending: false });

  if(error){
    gridProdutos.innerHTML = `<p style="color:var(--muted)">Não deu pra carregar os ebooks agora. Verifique a configuração do Supabase.</p>`;
    return;
  }

  todosEbooks = data || [];
  produtos = todosEbooks.filter(p => p.ativo !== false);
  document.getElementById("contadorEbooks").textContent = `${produtos.length} ebooks disponíveis agora`;
  renderizarProdutos(produtos);
}

function renderizarProdutos(lista){
  gridProdutos.innerHTML = "";
  if(lista.length === 0){
    gridProdutos.innerHTML = `<p style="color:var(--muted)">Nenhum ebook encontrado ainda.</p>`;
    return;
  }
  lista.forEach(p => {
    const cor = CORES_CATEGORIA[p.categoria] || "linear-gradient(135deg,#8B5CF6,#FF3E7F)";
    const emoji = EMOJI_CATEGORIA[p.categoria] || "📘";
    const card = document.createElement("div");
    card.className = "produto";
    card.innerHTML = `
      <div class="capa" style="background:${cor}">${emoji}</div>
      <div class="produto-info">
        <h3>${p.titulo}</h3>
        <p>Ebook digital · acesso imediato</p>
        <div class="preco-linha">
          <span>${p.preco_antigo ? `<span class="preco-antigo">R$ ${formatarPreco(p.preco_antigo)}</span>` : ""}<span class="preco">R$ ${formatarPreco(p.preco)}</span></span>
          <button class="comprar-btn" data-id="${p.id}">Comprar</button>
        </div>
      </div>
    `;
    gridProdutos.appendChild(card);
  });
}

// ============================================================
// COMPRAR COM PIX (Mercado Pago)
// ============================================================
let timerPagamento = null;
let pixCopiaECola = "";

function mostrarPixEstado(estado){
  document.getElementById("pixCarregando").style.display = estado === "carregando" ? "block" : "none";
  document.getElementById("pixQr").style.display = estado === "qr" ? "block" : "none";
  document.getElementById("pixOk").style.display = estado === "ok" ? "block" : "none";
  document.getElementById("pixErro").style.display = estado === "erro" ? "block" : "none";
}

function fecharModalPix(){
  clearInterval(timerPagamento);
  timerPagamento = null;
  document.getElementById("modalPix").style.display = "none";
}

async function copiarPix(){
  try{
    await navigator.clipboard.writeText(pixCopiaECola);
    const b = document.getElementById("btnCopiarPix");
    b.textContent = "Copiado ✓";
    setTimeout(() => (b.textContent = "Copiar código Pix"), 1500);
  }catch(_e){
    document.getElementById("pixCodigo").select();
  }
}

function vigiarPagamento(paymentId){
  clearInterval(timerPagamento);
  let tentativas = 0;
  timerPagamento = setInterval(async () => {
    tentativas++;
    if(tentativas > 150){ clearInterval(timerPagamento); return; } // ~10 minutos
    const { data } = await supabaseClient
      .from("compras").select("status").eq("payment_id", paymentId).maybeSingle();
    if(data?.status === "pago"){
      clearInterval(timerPagamento);
      mostrarPixEstado("ok");
      setTimeout(fecharModalPix, 2500);
    }
  }, 4000);
}

async function comprarEbook(ebookId){
  document.getElementById("modalPix").style.display = "flex";
  mostrarPixEstado("carregando");

  const { data, error } = await supabaseClient.functions.invoke("criar-pagamento-pix", {
    body: { ebookId }
  });

  if(error || !data || data.error){
    document.getElementById("pixErroTexto").textContent =
      data?.error || "Não foi possível gerar o Pix agora. Tente de novo.";
    mostrarPixEstado("erro");
    return;
  }

  if(data.status === "ja_comprado"){
    document.getElementById("pixErroTexto").textContent = "Você já comprou esse ebook. Ele está no seu perfil.";
    mostrarPixEstado("erro");
    return;
  }

  pixCopiaECola = data.qr_code;
  document.getElementById("pixTitulo").textContent = data.titulo;
  document.getElementById("pixValor").textContent = "R$ " + formatarPreco(data.valor);
  document.getElementById("pixImg").src = "data:image/png;base64," + data.qr_code_base64;
  document.getElementById("pixCodigo").value = data.qr_code;
  mostrarPixEstado("qr");
  vigiarPagamento(data.payment_id);
}

gridProdutos.addEventListener("click", (e) => {
  if(e.target.classList.contains("comprar-btn")){
    comprarEbook(e.target.dataset.id);
  }
});

// ---------- BUSCA ----------
function buscar(event){
  event.preventDefault();
  const termo = document.getElementById("campoBusca").value.toLowerCase().trim();
  const filtrados = termo
    ? produtos.filter(p => p.titulo.toLowerCase().includes(termo) || (p.categoria || "").includes(termo))
    : produtos;
  renderizarProdutos(filtrados);
  document.getElementById("mais-vendidos").scrollIntoView({ behavior: "smooth" });
  return false;
}

// ---------- FILTRO POR CATEGORIA ----------
document.querySelectorAll(".categoria").forEach(el => {
  el.addEventListener("click", () => {
    const cat = el.dataset.cat;
    renderizarProdutos(produtos.filter(p => p.categoria === cat));
    document.getElementById("mais-vendidos").scrollIntoView({ behavior: "smooth" });
  });
});

// ============================================================
// PUBLICAR EBOOK (só aparece pro admin)
// ============================================================
function abrirModalPublicar(){
  document.getElementById("modalPublicar").style.display = "flex";
}
function fecharModalPublicar(){
  document.getElementById("modalPublicar").style.display = "none";
}

async function publicarEbook(event){
  event.preventDefault();
  const form = event.target;
  const msg = document.getElementById("pubMsg");
  const arquivo = document.getElementById("pArquivo").files[0];
  if(!arquivo){ msg.textContent = "Escolha o arquivo do ebook."; return false; }

  msg.textContent = "Enviando arquivo...";
  const { data: { session } } = await supabaseClient.auth.getSession();

  // nome do arquivo sem acento nem espaço
  const nomeLimpo = arquivo.name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-");
  const caminho = `${Date.now()}-${nomeLimpo}`;

  const { error: erroUpload } = await supabaseClient.storage
    .from("ebooks-privados").upload(caminho, arquivo);
  if(erroUpload){ msg.textContent = "Erro no envio: " + erroUpload.message; return false; }

  const paraNumero = v => v ? parseFloat(v.replace(",", ".")) : null;

  const { error } = await supabaseClient.from("ebooks").insert([{
    titulo: document.getElementById("pTitulo").value.trim(),
    categoria: document.getElementById("pCategoria").value,
    preco: paraNumero(document.getElementById("pPreco").value.trim()),
    preco_antigo: paraNumero(document.getElementById("pPrecoAntigo").value.trim()),
    arquivo_path: caminho,
    autor_email: session.user.email
  }]);

  if(error){
    // desfaz o upload se o cadastro falhou
    await supabaseClient.storage.from("ebooks-privados").remove([caminho]);
    msg.textContent = error.message;
    return false;
  }

  msg.textContent = "Ebook publicado!";
  setTimeout(() => {
    fecharModalPublicar();
    msg.textContent = "";
    form.reset();
    carregarProdutos();
  }, 800);
  return false;
}

// ============================================================
// PAINEL ADMIN (editar / excluir ebooks)
// ============================================================
function esc(t){
  return String(t ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function abrirAdmin(){
  document.getElementById("aCategoria").innerHTML = document.getElementById("pCategoria").innerHTML;
  document.getElementById("modalAdmin").style.display = "flex";
  mostrarAdminLista();
}

function fecharAdmin(){
  document.getElementById("modalAdmin").style.display = "none";
}

function mostrarAdminLista(){
  document.getElementById("adminEdicao").style.display = "none";
  document.getElementById("adminLista").style.display = "block";
  document.getElementById("adminMsg").textContent = "";

  const area = document.getElementById("adminItens");
  if(todosEbooks.length === 0){
    area.innerHTML = `<p class="avatar-vazio">Nenhum ebook publicado ainda.</p>`;
    return;
  }
  area.innerHTML = todosEbooks.map(p => {
    const oculto = p.ativo === false;
    return `
    <div class="item-comprado" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;${oculto ? "opacity:.6" : ""}">
      <span style="flex:1;min-width:140px;word-break:break-word">📘 ${esc(p.titulo)}<br><small style="color:var(--muted)">R$ ${formatarPreco(p.preco)}${oculto ? " · oculto da loja" : ""}</small></span>
      <span style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="comprar-btn" onclick="editarEbook(${p.id})">Editar</button>
        <button class="comprar-btn" style="background:#4b3a78" onclick="alternarVisibilidade(${p.id})">${oculto ? "Mostrar" : "Ocultar"}</button>
        <button class="comprar-btn" style="background:rgba(255,62,127,0.85)" onclick="excluirEbook(${p.id})">Excluir</button>
      </span>
    </div>`;
  }).join("");
}

function editarEbook(id){
  const p = todosEbooks.find(x => x.id === id);
  if(!p) return;
  document.getElementById("aId").value = p.id;
  document.getElementById("aTitulo").value = p.titulo;
  document.getElementById("aCategoria").value = p.categoria || "";
  document.getElementById("aPreco").value = formatarPreco(p.preco);
  document.getElementById("aPrecoAntigo").value = p.preco_antigo ? formatarPreco(p.preco_antigo) : "";
  document.getElementById("adminMsg").textContent = "";
  document.getElementById("adminLista").style.display = "none";
  document.getElementById("adminEdicao").style.display = "block";
}

async function salvarEdicao(event){
  event.preventDefault();
  const msg = document.getElementById("adminMsg");
  const paraNum = v => v ? parseFloat(String(v).replace(",", ".")) : null;
  const preco = paraNum(document.getElementById("aPreco").value.trim());
  if(!isFinite(preco) || preco <= 0){ msg.textContent = "Preço inválido."; return false; }

  msg.textContent = "Salvando...";
  const { data, error } = await supabaseClient.from("ebooks").update({
    titulo: document.getElementById("aTitulo").value.trim(),
    categoria: document.getElementById("aCategoria").value,
    preco,
    preco_antigo: paraNum(document.getElementById("aPrecoAntigo").value.trim())
  }).eq("id", document.getElementById("aId").value).select();

  if(error || !data || data.length === 0){
    msg.textContent = error ? error.message : "Não foi possível salvar (sem permissão).";
    return false;
  }
  await carregarProdutos();
  mostrarAdminLista();
  document.getElementById("adminMsg").textContent = "Salvo ✓";
  return false;
}

async function alternarVisibilidade(id){
  const p = todosEbooks.find(x => x.id === id);
  if(!p) return;
  const msg = document.getElementById("adminMsg");
  const novoValor = p.ativo === false; // se estava oculto, volta a ser exibido
  msg.textContent = "Salvando...";

  const { data, error } = await supabaseClient
    .from("ebooks").update({ ativo: novoValor }).eq("id", id).select();
  if(error || !data || data.length === 0){
    msg.textContent = error ? error.message : "Não foi possível alterar (sem permissão).";
    return;
  }
  await carregarProdutos();
  mostrarAdminLista();
  document.getElementById("adminMsg").textContent = novoValor
    ? "Ebook de volta na loja ✓"
    : "Ebook oculto da loja ✓ (quem já comprou continua com acesso)";
}

async function excluirEbook(id){
  const p = todosEbooks.find(x => x.id === id);
  if(!p) return;
  const msg = document.getElementById("adminMsg");
  msg.textContent = "Verificando compras...";

  const { count, error: erroCount } = await supabaseClient
    .from("compras").select("id", { count: "exact", head: true })
    .eq("ebook_id", id).eq("status", "pago");
  if(erroCount){
    msg.textContent = "Não foi possível verificar as compras: " + erroCount.message;
    return;
  }
  if(count > 0){
    msg.textContent = `Não dá pra excluir: ${count} pessoa(s) já compraram. Use "Ocultar" pra tirar da loja sem tirar o acesso de quem pagou.`;
    return;
  }

  const ok = confirm(`Excluir "${p.titulo}" de vez?\n\nNinguém comprou ainda. Não dá pra desfazer.`);
  if(!ok){ msg.textContent = ""; return; }

  msg.textContent = "Excluindo...";

  const { data: atual } = await supabaseClient
    .from("ebooks").select("arquivo_path").eq("id", id).single();

  const { data, error } = await supabaseClient.from("ebooks").delete().eq("id", id).select();
  if(error || !data || data.length === 0){
    msg.textContent = error ? error.message : "Não foi possível excluir (sem permissão).";
    return;
  }

  if(atual?.arquivo_path){
    await supabaseClient.storage.from("ebooks-privados").remove([atual.arquivo_path]);
  }
  await carregarProdutos();
  mostrarAdminLista();
  document.getElementById("adminMsg").textContent = "Ebook excluído ✓";
}

console.log("Império dos Ebooks carregado!");
