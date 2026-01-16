import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Package, Edit2, Trash2, Search, AlertTriangle, X, Save, Image as ImageIcon, TrendingUp, Loader2, Upload, Camera } from 'lucide-react';
import { Product } from '../types';
import { supabase } from '../src/supabaseClient';
import { useAuth } from '../AuthContext';

const ProductsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats
  const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const lowStockCount = products.filter(p => (p.stock || 0) <= (p.minStock || 0)).length;
  const stockValue = products.reduce((acc, p) => acc + ((p.stock || 0) * (p.price || 0)), 0);

  // --- FETCH PRODUCTS ---
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;

      if (data) {
        const mappedProducts: Product[] = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price || 0,
          costPrice: p.cost_price || 0,
          stock: p.stock || 0,
          minStock: p.min_stock || 0,
          category: p.category || 'Geral',
          image: p.image || '',
          description: p.description || ''
        }));
        setProducts(mappedProducts);
      }
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Extrair categorias únicas existentes + padrões
  const uniqueCategories = useMemo(() => {
    const categories = new Set(products.map(p => p.category));
    // Adiciona categorias padrão caso não existam
    ['Cabelo', 'Barba', 'Acessórios', 'Tratamento', 'Geral'].forEach(c => categories.add(c));
    return Array.from(categories).sort();
  }, [products]);

  // Filtragem
  const filteredProducts = useMemo(() => {
    return products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const handleAddNew = () => {
    setSelectedProduct({
      id: '', // Empty for new
      name: '',
      price: 0,
      costPrice: 0,
      stock: 0,
      minStock: 5,
      category: '',
      image: '',
      description: ''
    });
    setIsDeleteConfirming(false);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct({ ...product });
    setIsDeleteConfirming(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('✅ Produto excluído com sucesso!');
      window.location.reload();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      alert(`❌ Erro ao excluir: ${error.message}`);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const dataToSave = {
      name: selectedProduct.name,
      price: selectedProduct.price,
      cost_price: selectedProduct.costPrice,
      stock: selectedProduct.stock,
      min_stock: selectedProduct.minStock,
      category: selectedProduct.category.trim() || 'Geral',
      image: selectedProduct.image,
      description: selectedProduct.description,
      tenant_id: currentUser?.tenantId
    };

    try {
      if (selectedProduct.id) {
        // Update
        const { error } = await supabase
          .from('products')
          .update(dataToSave)
          .eq('id', selectedProduct.id);
        if (error) throw error;
        alert('Produto atualizado!');
      } else {
        // Insert
        const { error } = await supabase
          .from('products')
          .insert([dataToSave]);
        if (error) throw error;
        alert('Produto cadastrado!');
      }

      setSelectedProduct(null);
      fetchProducts();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      alert(`Erro ao salvar: ${error.message}`);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser?.tenantId}/product-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        alert('Erro ao fazer upload da imagem. Tente novamente.');
        return null;
      }

      const { data } = supabase.storage
        .from('app-assets')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error in upload helper:', error);
      return null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsUploading(true);
    try {
      const file = e.target.files[0];
      const publicUrl = await uploadImage(file);

      if (publicUrl) {
        updateField('image', publicUrl);
        alert('Foto enviada com sucesso!');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Falha no upload da foto.');
    } finally {
      setIsUploading(false);
    }
  };

  const updateField = (field: keyof Product, value: any) => {
    if (selectedProduct) {
      setSelectedProduct({ ...selectedProduct, [field]: value });
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Produtos</h1>
          <p className="text-gray-400">Gerencie o estoque e vendas de produtos.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-dark-950 px-4 py-2 rounded-lg font-semibold transition-colors shadow-lg shadow-primary-500/20"
        >
          <Plus size={20} />
          Novo Produto
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-dark-900 p-5 rounded-xl border border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm font-medium">Itens em Estoque</p>
            <p className="text-2xl font-bold text-white mt-1">{totalStock}</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-500">
            <Package size={24} />
          </div>
        </div>
        <div className="bg-dark-900 p-5 rounded-xl border border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm font-medium">Estoque Baixo</p>
            <p className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {lowStockCount} itens
            </p>
          </div>
          <div className={`p-3 rounded-lg ${lowStockCount > 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
            <AlertTriangle size={24} />
          </div>
        </div>
        <div className="bg-dark-900 p-5 rounded-xl border border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm font-medium">Valor em Vendas</p>
            <p className="text-2xl font-bold text-primary-500 mt-1">R$ {stockValue.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-primary-500/10 rounded-lg text-primary-500">
            <Package size={24} />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome, categoria..."
          className="w-full md:w-96 pl-10 pr-4 py-3 bg-dark-900 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
        />
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p>Carregando produtos...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((product) => {
            const profit = product.price - product.costPrice;
            const margin = product.price > 0 ? ((profit / product.price) * 100).toFixed(0) : 0;

            return (
              <div key={product.id} className="bg-dark-900 rounded-xl border border-gray-800 overflow-hidden group hover:border-gray-700 transition-all flex flex-col">
                <div className="h-48 relative bg-gray-800 overflow-hidden">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                      <ImageIcon size={48} />
                    </div>
                  )}

                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 p-1.5 rounded-lg backdrop-blur-sm">
                    <button
                      onClick={() => handleEdit(product)}
                      className="p-1.5 text-white hover:bg-white/20 rounded-md transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-md transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {product.stock <= product.minStock && (
                    <div className="absolute bottom-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                      <AlertTriangle size={12} />
                      <span>Baixo Estoque</span>
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold text-primary-500 uppercase tracking-wider">{product.category}</span>
                    <span className="text-xs text-gray-500">Estoque: {product.stock}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1 line-clamp-1" title={product.name}>{product.name}</h3>
                  <p className="text-sm text-gray-400 line-clamp-2 mb-3 flex-1">{product.description}</p>

                  {/* Profit Info Block */}
                  <div className="flex justify-between items-center mb-3 bg-gray-800/50 p-2 rounded text-xs">
                    <span className="text-gray-500">Custo: R$ {product.costPrice.toFixed(2)}</span>
                    <div className="flex items-center gap-1 text-green-500 font-medium">
                      <TrendingUp size={12} />
                      Lucro: R$ {profit.toFixed(2)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-800 mt-auto">
                    <div className="flex flex-col">
                      <span className="text-xs text-gray-500">Preço</span>
                      <span className="text-lg font-bold text-white">R$ {product.price.toFixed(2)}</span>
                    </div>
                    {product.stock > 0 ? (
                      <button className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors">
                        Vender
                      </button>
                    ) : (
                      <span className="text-xs text-red-500 font-bold uppercase">Esgotado</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500 bg-dark-900 rounded-xl border border-gray-800">
            <Package size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhum produto encontrado</p>
            <button onClick={handleAddNew} className="mt-4 text-primary-500 hover:underline">Cadastrar o primeiro produto</button>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-dark-900 rounded-xl border border-gray-800 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-800 shrink-0">
              <h2 className="text-xl font-bold text-white">
                {products.some(p => p.id === selectedProduct.id) ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-5">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Imagem Preview */}
                <div className="col-span-1 md:col-span-2 flex justify-center">
                  <div className="w-32 h-32 rounded-xl bg-gray-800 border-2 border-dashed border-gray-700 flex items-center justify-center overflow-hidden relative group">
                    {selectedProduct.image ? (
                      <img src={selectedProduct.image} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-2">
                        <ImageIcon className="mx-auto text-gray-600 mb-1" size={24} />
                        <span className="text-xs text-gray-500">Sem imagem</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Nome e Categoria */}
                <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Nome do Produto</label>
                    <input
                      type="text"
                      value={selectedProduct.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                      placeholder="Ex: Pomada Matte"
                      required
                    />
                  </div>

                  {/* Seletor de Categoria Inteligente (Combobox) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Categoria</label>
                    <div className="relative">
                      <input
                        type="text"
                        list="categories-list"
                        value={selectedProduct.category}
                        onChange={(e) => updateField('category', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 placeholder-gray-500"
                        placeholder="Selecione ou digite nova..."
                        required
                      />
                      <datalist id="categories-list">
                        {uniqueCategories.map(cat => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">Selecione da lista ou digite para criar uma nova.</p>
                  </div>
                </div>

                {/* Preços e Estoque */}
                <div className="col-span-1 md:col-span-2 bg-gray-800/30 p-4 rounded-lg border border-gray-800">
                  <h3 className="text-sm font-bold text-gray-300 uppercase mb-3">Financeiro & Estoque</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Preço Venda</label>
                      <div className="relative">
                        <span className="absolute left-2 top-2 text-gray-500 text-xs">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={selectedProduct.price}
                          onChange={(e) => updateField('price', parseFloat(e.target.value))}
                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 pl-6 py-1.5 text-white text-sm focus:border-primary-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Preço Custo</label>
                      <div className="relative">
                        <span className="absolute left-2 top-2 text-gray-500 text-xs">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={selectedProduct.costPrice}
                          onChange={(e) => updateField('costPrice', parseFloat(e.target.value))}
                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 pl-6 py-1.5 text-white text-sm focus:border-primary-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Qtd Atual</label>
                      <input
                        type="number"
                        value={selectedProduct.stock}
                        onChange={(e) => updateField('stock', parseInt(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-white text-sm focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Estoque Mín.</label>
                      <input
                        type="number"
                        value={selectedProduct.minStock}
                        onChange={(e) => updateField('minStock', parseInt(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-white text-sm focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Descrição e Upload de Imagem */}
                <div className="col-span-1 md:col-span-2 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Foto do Produto</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                        {isUploading ? (
                          <Loader2 className="animate-spin text-primary-500" size={24} />
                        ) : selectedProduct.image ? (
                          <img src={selectedProduct.image} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="text-gray-600" size={24} />
                        )}
                      </div>

                      <div className="flex-1 space-y-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors border border-gray-700 disabled:opacity-50"
                          >
                            <Upload size={16} />
                            Subir Foto / Câmera
                          </button>
                          {selectedProduct.image && (
                            <button
                              type="button"
                              onClick={() => updateField('image', '')}
                              className="px-3 py-2 text-red-500 hover:bg-red-500/10 text-xs rounded-lg transition-colors"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500">Dica: Fotos quadradas (1:1) ficam melhores no catálogo.</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Descrição</label>
                    <textarea
                      rows={3}
                      value={selectedProduct.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 text-sm resize-none"
                      placeholder="Descreva o produto, benefícios ou como usar..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between w-full pt-4 border-t border-gray-800">
                {/* Delete Area */}
                <div>
                  {selectedProduct.id && (
                    isDeleteConfirming ? (
                      <div className="flex items-center gap-2 animate-in slide-in-from-left-2 fade-in">
                        <button
                          type="button"
                          onClick={() => handleDelete(selectedProduct.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-lg"
                        >
                          SIM, APAGAR
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsDeleteConfirming(false)}
                          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsDeleteConfirming(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-400 font-bold rounded-lg transition-colors border border-red-500/20"
                      >
                        <Trash2 size={20} />
                        Excluir
                      </button>
                    )
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2 bg-primary-500 hover:bg-primary-600 text-dark-950 font-bold rounded-lg transition-colors shadow-lg"
                  >
                    <Save size={20} />
                    {selectedProduct.id ? 'Salvar Alterações' : 'Cadastrar Produto'}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
