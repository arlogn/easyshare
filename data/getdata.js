self.on('click', function(node) {
  /* 
    Add image size if not already present
  */
  if (!node.getAttribute('width') && !node.getAttribute('height')) {
    node.setAttribute('width', node.clientWidth);
    node.setAttribute('height', node.clientHeight);
  }
  /* 
    Remove inline css
  */
  if (node.getAttribute('style')) node.removeAttribute('style');	
  /* 
    Set absolute URL
  */
  node.setAttribute('src', node.src);
  /*
    Add or replace ID
  */
  if (node.getAttribute('id')) node.removeAttribute('id');
  node.setAttribute('id', 'thumb');
  /* 
    Store node, title, URL and selection
  */
  var data = { node : node.outerHTML, 
               title: document.title, 
               url  : document.URL, 
               sel  : document.getSelection().toString() };

  self.postMessage(data);
  
});
