import pandas as pd
import streamlit as st
import plotly.express as px
import datetime

# Configuração da Página
st.set_page_config(
    page_title="Painel de Confrarias Cervejeiras",
    page_icon="🍻",
    layout="wide"
)

# Estilização CSS customizada para cards e alertas
st.markdown("""
    <style>
    .main { background-color: #faf9f6; }
    .stat-card {
        background-color: #ffffff;
        border: 1px solid #e0e0e0;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        text-align: center;
    }
    .stat-number { font-size: 24px; font-weight: bold; color: #b45309; }
    .stat-label { font-size: 14px; color: #6b7280; }
    </style>
""", unsafe_allow_html=True)

# URL Pública da Planilha do Google Sheets (Aba "Geral")
# Usamos a exportação em formato CSV diretamente pelo ID da planilha
SHEET_ID = "1S_ajLE6RhxOfa771lQaWYcAKhK_BnS1fRC9lLhABLx4"
SHEET_NAME = "Geral"
CSV_URL = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={SHEET_NAME}"

@st.cache_data(ttl=600)
def carregar_dados():
    try:
        df = pd.read_csv(CSV_URL)
        # Limpeza básica de colunas (removendo espaços extras se houver)
        df.columns = df.columns.str.strip()
        return df
    except Exception as e:
        st.error(f"Erro ao carregar os dados do Google Sheets: {e}")
        return pd.DataFrame()

# Carregando os dados
df_original = carregar_dados()

if df_original.empty:
    st.warning("⚠️ Não foi possível carregar os dados. Verifique se a planilha está pública ('Qualquer pessoa com o link pode ver') e se a aba 'Geral' existe.")
    st.stop()

# Padronizar colunas numéricas essenciais (tratando conversões de string/vírgula se necessário)
for col in ['ABV', 'IBU', 'EBC']:
    if col in df_original.columns:
        df_original[col] = pd.to_numeric(
            df_original[col].astype(str).str.replace(',', '.', regex=True).str.extract(r'([\d\.]+)', expand=False), 
            errors='coerce'
        )

# Título Principal
st.title("🍻 Painel Interativo de Confrarias & Cervejas")
st.markdown("Explore os dados da planilha de forma automatizada, filtre por estilo, acompanhe indicadores e realize degustações.")

# --- BARRA LATERAL (FILTROS) ---
st.sidebar.header("🔍 Filtros de Pesquisa")

# Busca textual livre
busca_texto = st.sidebar.text_input("Busca livre (Cervejaria, Nome, etc.)", "")

# Filtros dinâmicos baseados nas colunas disponíveis
def obter_opcoes(coluna):
    if coluna in df_original.columns:
        return ["Todos"] + sorted(df_original[coluna].dropna().astype(str).unique().tolist())
    return ["Todos"]

confraria_opcoes = obter_opcoes("Confraria")
filtro_confraria = st.sidebar.selectbox("Confraria", confraria_opcoes)

estilo_opcoes = obter_opcoes("Estilo")
filtro_estilo = st.sidebar.selectbox("Estilo / Tipo de Cerveja", estilo_opcoes)

st.sidebar.markdown("---")
st.sidebar.subheader("🎚️ Filtros Numéricos")

# Filtro ABV
if 'ABV' in df_original.columns and not df_original['ABV'].isnull().all():
    min_abv, max_abv = float(df_original['ABV'].min()), float(df_original['ABV'].max())
    filtro_abv = st.sidebar.slider("Teor Alcoólico (ABV %)", min_value=min_abv, max_value=max_abv, value=(min_abv, max_abv))
else:
    filtro_abv = None

# Filtro IBU
if 'IBU' in df_original.columns and not df_original['IBU'].isnull().all():
    min_ibu, max_ibu = float(df_original['IBU'].min()), float(df_original['IBU'].max())
    filtro_ibu = st.sidebar.slider("Amargor (IBU)", min_value=min_ibu, max_value=max_ibu, value=(min_ibu, max_ibu))
else:
    filtro_ibu = None

# Filtro EBC
if 'EBC' in df_original.columns and not df_original['EBC'].isnull().all():
    min_ebc, max_ebc = float(df_original['EBC'].min()), float(df_original['EBC'].max())
    filtro_ebc = st.sidebar.slider("Cor (EBC)", min_value=min_ebc, max_value=max_ebc, value=(min_ebc, max_ebc))
else:
    filtro_ebc = None

# --- APLICAÇÃO DOS FILTROS ---
df_filtrado = df_original.copy()

if busca_texto:
    mask = df_filtrado.astype(str).apply(lambda x: x.str.contains(busca_texto, case=False, na=False)).any(axis=1)
    df_filtrado = df_filtrado[mask]

if filtro_confraria != "Todos":
    df_filtrado = df_filtrado[df_filtrado['Confraria'].astype(str) == filtro_confraria]

if filtro_estilo != "Todos":
    df_filtrado = df_filtrado[df_filtrado['Estilo'].astype(str) == filtro_estilo]

if filtro_abv and 'ABV' in df_filtrado.columns:
    df_filtrado = df_filtrado[(df_filtrado['ABV'] >= filtro_abv[0]) & (df_filtrado['ABV'] <= filtro_abv[1])]

if filtro_ibu and 'IBU' in df_filtrado.columns:
    df_filtrado = df_filtrado[(df_filtrado['IBU'] >= filtro_ibu[0]) & (df_filtrado['IBU'] <= filtro_ibu[1])]

if filtro_ebc and 'EBC' in df_filtrado.columns:
    df_filtrado = df_filtrado[(df_filtrado['EBC'] >= filtro_ebc[0]) & (df_filtrado['EBC'] <= filtro_ebc[1])]


# --- CARDS DE RESUMO ESTATÍSTICO ---
st.markdown("### 📊 Indicadores Gerais")
col1, col2, col3, col4 = st.columns(4)

total_cervejas = len(df_filtrado)
media_abv = f"{df_filtrado['ABV'].mean():.2f}%" if 'ABV' in df_filtrado.columns and not df_filtrado['ABV'].isnull().all() else "N/D"
media_ibu = f"{df_filtrado['IBU'].mean():.1f}" if 'IBU' in df_filtrado.columns and not df_filtrado['IBU'].isnull().all() else "N/D"
total_confrarias = df_filtrado['Confraria'].nunique() if 'Confraria' in df_filtrado.columns else 0

with col1:
    st.markdown(f"""<div class="stat-card"><div class="stat-number">{total_cervejas}</div><div class="stat-label">Cervejas Filtradas</div></div>""", unsafe_allow_html=True)
with col2:
    st.markdown(f"""<div class="stat-card"><div class="stat-number">{media_abv}</div><div class="stat-label">Média ABV</div></div>""", unsafe_allow_html=True)
with col3:
    st.markdown(f"""<div class="stat-card"><div class="stat-number">{media_ibu}</div><div class="stat-label">Média IBU</div></div>""", unsafe_allow_html=True)
with col4:
    st.markdown(f"""<div class="stat-card"><div class="stat-number">{total_confrarias}</div><div class="stat-label">Confrarias Envolvidas</div></div>""", unsafe_allow_html=True)

st.markdown("<br>", unsafe_allow_html=True)

# --- VISUALIZAÇÃO DA TABELA E ALERTAS ---
st.subheader("📋 Lista de Registros da Planilha")

# Indicador de Alerta de Dados Faltantes (ABV, IBU ou EBC nulos)
if not df_filtrado.empty:
    colunas_obrigatorias = [c for c in ['ABV', 'IBU', 'EBC'] if c in df_filtrado.columns]
    pendencias_count = df_filtrado[colunas_obrigatorias].isnull().any(axis=1).sum() if colunas_obrigatorias else 0
    if pendencias_count > 0:
        st.info(f"💡 Dica de Alerta: Existem {pendencias_count} registros na seleção atual com dados incompletos de ABV, IBU ou EBC.")

# Exibir Tabela Responsiva
st.dataframe(df_filtrado, use_container_width=True)

# Botão de Exportação para CSV
csv_data = df_filtrado.to_csv(index=False).encode('utf-8')
st.download_button(
    label="📥 Baixar listagem filtrada (CSV / Cardápio)",
    data=csv_data,
    file_name=f"cardapio_confraria_{datetime.date.today()}.csv",
    mime="text/csv",
)

# --- GRÁFICOS INTERATIVOS ---
if not df_filtrado.empty and 'ABV' in df_filtrado.columns and 'IBU' in df_filtrado.columns:
    st.markdown("---")
    st.subheader("📈 Análises Gráficas")
    
    g_col1, g_col2 = st.columns(2)
    
    with g_col1:
        # Gráfico de dispersão IBU vs ABV
        fig_scatter = px.scatter(
            df_filtrado, x='ABV', y='IBU', color='Confraria' if 'Confraria' in df_filtrado.columns else None,
            hover_data=df_filtrado.columns[:3], title="Relação: Teor Alcoólico (ABV) vs Amargor (IBU)"
        )
        st.plotly_chart(fig_scatter, use_container_width=True)
        
    with g_col2:
        # Gráfico de barras por Estilo
        if 'Estilo' in df_filtrado.columns:
            df_estilos = df_filtrado['Estilo'].value_counts().reset_index()
            df_estilos.columns = ['Estilo', 'Quantidade']
            fig_bar = px.bar(df_estilos.head(10), x='Estilo', y='Quantidade', title="Top 10 Estilos na Seleção", color='Quantidade')
            st.plotly_chart(fig_bar, use_container_width=True)

# --- MODO DEGUSTAÇÃO / CARTÃO DE NOTAS ---
st.markdown("---")
st.subheader("📝 Modo Degustação e Notas (Sessão Atual)")
st.markdown("Avalie os rótulos apresentados e salve suas impressões abaixo:")

if not df_filtrado.empty:
    # Selecionar uma cerveja da lista filtrada para avaliar
    opcoes_cervejas = df_filtrado.apply(lambda row: f"{row.iloc[0]} - {row.get('Estilo', 'Estilo não informado')}", axis=str(1) if len(df_filtrado)>0 else 1).tolist()
    
    selected_item = st.selectbox("Escolha a cerveja para avaliar:", df_filtrado.index)
    
    if selected_item is not None:
        row_sel = df_filtrado.loc[selected_item]
        st.write(f"**Detalhes selecionados:** {row_sel.to_dict()}")
        
        with st.form("form_avaliacao"):
            col_a, col_b, col_c = st.columns(3)
            with col_a:
                aroma = st.slider("Nota Aroma (1-5)", 1, 5, 3)
            with col_b:
                sabor = st.slider("Nota Sabor (1-5)", 1, 5, 3)
            with col_c:
                geral = st.slider("Impressão Geral (1-5)", 1, 5, 3)
            
            comentario = st.text_area("Comentários / Notas de Prova:")
            submitted = st.form_submit_button("Salvar Avaliação")
            
            if submitted:
                if 'avaliacoes' not in st.session_state:
                    st.session_state['avaliacoes'] = []
                
                nova_avaliacao = {
                    "Data": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
                    "Cerveja": str(row_sel.values[0]),
                    "Aroma": aroma,
                    "Sabor": sabor,
                    "Geral": geral,
                    "Comentário": comentario
                }
                st.session_state['avaliacoes'].append(nova_avaliacao)
                st.success("Avaliação registrada com sucesso na sessão!")

    # Exibir avaliações salvas na sessão
    if 'avaliacoes' in st.session_state and st.session_state['avaliacoes']:
        st.markdown("#### 📜 Histórico de Avaliações Feitas Nesta Sessão")
        df_avaliacoes = pd.DataFrame(st.session_state['avaliacoes'])
        st.dataframe(df_avaliacoes, use_container_width=True)