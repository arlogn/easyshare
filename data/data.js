var videoData = function () {
  var c = document.getElementById('content');
  if (!c) {
    console.log("Easyshare: video data not found.");
    return false;
  }
  var d = {
    url   : c.querySelector('[itemprop="url"]').getAttribute('href'),
    title : c.querySelector('[itemprop="name"]').getAttribute('content'),
    desc  : c.querySelector('[itemprop="description"]').getAttribute('content'),
    thumb : c.querySelector('[itemprop="thumbnailUrl"]').getAttribute('href')
  }
  return d;
};

self.on('click', function (node, data) {
  var d = { url: document.URL };

  switch (data) {
    case 'image' :
      d.thumb = '<img id="thumb" width="' + node.clientWidth + 
               '" height="' + node.clientHeight + '" src="' + node.src + '">';
      d.title = document.title; 
      d.text = window.getSelection().toString();
      d.video = false;
      d.videoUrl = 'none';
      break;
    case 'video' :
      var vd = videoData();
      if (vd) {
        d.thumb = '<img id="thumb" src="' + vd.thumb + '">';
        d.title = vd.title;
        d.text = vd.desc;
        d.videoUrl = vd.url;
      } else {
        d.thumb = '<img id="thumb" class="easyshare-placeholder" src="images/easyshare.png">';
        d.title = document.title;
        d.text = "";
        d.videoUrl = data.url;
      }
      d.video = true;
      break;
    case 'selection' :    	
      d.thumb = '<img id="thumb" class="easyshare-placeholder" src="images/easyshare.png">'
      d.title = document.title; 
      d.text = window.getSelection().toString();
      d.video = false;
      d.videoUrl = 'none';  
      break;
  }
  
  self.postMessage(d);
});
