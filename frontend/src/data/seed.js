export const seed = {
  tables: [
    {id:'1',number:'01',seats:4,status:'occupied',customerId:'1',openedAt:Date.now()-2500000},
    {id:'2',number:'02',seats:2,status:'available'},
    {id:'3',number:'03',seats:4,status:'occupied',customerId:'2',openedAt:Date.now()-1100000},
    {id:'4',number:'04',seats:6,status:'reserved',note:'Reserva 20:30'},
    {id:'5',number:'05',seats:2,status:'attention',customerId:'3',openedAt:Date.now()-5600000},
    {id:'6',number:'06',seats:4,status:'available'}
  ],
  customers: [
    {id:'1',name:'Marina Alves',phone:'(92) 99123-4401',cpf:'',visits:8},
    {id:'2',name:'Carlos Mendes',phone:'(92) 98845-1120',cpf:'123.456.789-00',visits:3},
    {id:'3',name:'Paulo Rocha',phone:'(92) 99210-7788',cpf:'',visits:12}
  ],
  products: [
    {id:'1',name:'Burger Orbe',price:42.9,category:'Hambúrgueres',sector:'churrasqueira',available:true,image:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600'},
    {id:'2',name:'Picanha na brasa',price:89.9,category:'Carnes',sector:'churrasqueira',available:true,image:'https://images.unsplash.com/photo-1544025162-d76694265947?w=600'},
    {id:'3',name:'Risoto amazônico',price:56,category:'Principais',sector:'cozinha',available:true,image:'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=600'},
    {id:'4',name:'Mojito da casa',price:25,category:'Bebidas',sector:'bar',available:true,image:'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600'},
    {id:'5',name:'Petit gâteau',price:28,category:'Sobremesas',sector:'sobremesa',available:true,image:'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600'}
  ],
  orders: [
    {id:'1847',tableId:'5',customerId:'3',status:'preparing',createdAt:Date.now()-1080000,items:[{productId:'3',qty:2,note:'Sem pimenta'}]},
    {id:'1849',tableId:'3',customerId:'2',status:'open',createdAt:Date.now()-780000,items:[{productId:'2',qty:1,note:''},{productId:'4',qty:2,note:''}]},
    {id:'1852',tableId:'1',customerId:'1',status:'ready',createdAt:Date.now()-420000,items:[{productId:'5',qty:2,note:''}]}
  ],
  inventory: [
    {id:'1',name:'Picanha',category:'Carnes',unit:'kg',quantity:8.5,min:10},
    {id:'2',name:'Arroz arbóreo',category:'Grãos',unit:'kg',quantity:24,min:8},
    {id:'3',name:'Limão',category:'Hortifruti',unit:'kg',quantity:4,min:5},
    {id:'4',name:'Refrigerante lata',category:'Bebidas',unit:'un',quantity:96,min:30}
  ],
  transactions: [
    {id:'1',type:'sale',description:'Venda #1844',amount:245.8,payment:'pix',createdAt:Date.now()-7200000},
    {id:'2',type:'sale',description:'Venda #1845',amount:184,payment:'card',createdAt:Date.now()-5400000},
    {id:'3',type:'withdrawal',description:'Sangria de segurança',amount:-300,payment:'cash',createdAt:Date.now()-3600000}
  ],
  settings:{restaurant:'Seu Restaurante',city:'Manaus · Amazonas',serviceFee:10,currency:'BRL'}
};
