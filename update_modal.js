const fs = require('fs');
let c = fs.readFileSync('src/components/TransactionModal.tsx', 'utf8');
c = c.replace('categorias,\n    favoritos,', 'categorias,\n    contas,\n    cartoes,\n    favoritos,');
c = c.replace('categorias,\r\n    favoritos,', 'categorias,\r\n    contas,\r\n    cartoes,\r\n    favoritos,');

const ui = `</ScrollView>

            {/* Fonte de Recursos (Conta / Cartão) */}
            <View style={[styles.secaoTituloLinha, { marginTop: 14 }]}>
              <Text style={[styles.labelSecao, { color: theme.textSecondary }]}>
                {formaPagamento === 'cartao_credito' ? 'Cartão de Crédito' : 'Conta de Pagamento'}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listaCategoriasHorizontal}>
              {formaPagamento === 'cartao_credito' ? (
                cartoes.map((cartao) => {
                  const selecionada = cartaoId === cartao.id;
                  return (
                    <TouchableOpacity key={cartao.id} onPress={() => { AppHaptics.toqueLeve(); setCartaoId(cartao.id); }} style={[styles.chipFormaPagamento, { backgroundColor: selecionada ? theme.primary : theme.inputBg, borderColor: selecionada ? theme.primary : theme.inputBorder }]}>
                      <Ionicons name="card-outline" size={16} color={selecionada ? '#FFFFFF' : theme.textSecondary} />
                      <Text style={[styles.chipTexto, { color: selecionada ? '#FFFFFF' : theme.text }]}>{cartao.nome}</Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                contas.map((conta) => {
                  const selecionada = contaId === conta.id;
                  return (
                    <TouchableOpacity key={conta.id} onPress={() => { AppHaptics.toqueLeve(); setContaId(conta.id); }} style={[styles.chipFormaPagamento, { backgroundColor: selecionada ? theme.primary : theme.inputBg, borderColor: selecionada ? theme.primary : theme.inputBorder }]}>
                      <Ionicons name="wallet-outline" size={16} color={selecionada ? '#FFFFFF' : theme.textSecondary} />
                      <Text style={[styles.chipTexto, { color: selecionada ? '#FFFFFF' : theme.text }]}>{conta.nome}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Seletor de Data Flexível`;

c = c.replace('</ScrollView>\\n\\n            {/* Seletor de Data Flexível', ui);
c = c.replace('</ScrollView>\\r\\n\\r\\n            {/* Seletor de Data Flexível', ui);
c = c.replace('</ScrollView>\n\n            {/* Seletor de Data Flexível', ui);
c = c.replace('</ScrollView>\r\n\r\n            {/* Seletor de Data Flexível', ui);

fs.writeFileSync('src/components/TransactionModal.tsx', c);
