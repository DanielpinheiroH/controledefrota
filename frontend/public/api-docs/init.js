window.addEventListener('load',function(){
  SwaggerUIBundle({url:'/api/openapi.json',dom_id:'#swagger-ui',deepLinking:true,withCredentials:true,requestInterceptor:function(request){request.headers['X-Requested-With']='FrotaGest';return request;}});
});
