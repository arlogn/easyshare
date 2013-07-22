var videoData = function () {
  if (!document.getElementById('content')) {
    console.log("Easyshare: video data not found.");
    return false;
  }
  var data = {}, c = document.getElementById('content');
  data.url   = c.querySelector('[itemprop="url"]').getAttribute('href');
  data.title = c.querySelector('[itemprop="name"]').getAttribute('content');
  data.desc  = c.querySelector('[itemprop="description"]').getAttribute('content');
  data.thumb = c.querySelector('[itemprop="thumbnailUrl"]').getAttribute('href');
  return data;
}

self.on('click', function(node) {
  var data = {};
  
  data.url = document.URL;
  
  if (node.nodeName == 'IMG') {
    data.node = '<img id="thumb" width="' + node.clientWidth + 
                '" height="' + node.clientHeight + '" src="' + node.src + '">';
    data.title = document.title; 
    data.text = document.getSelection().toString();
    data.video = false;
    data.videoUrl = 'none';
  } else {
  	 var vd = videoData();
  	 if (vd) {
      data.node = '<img id="thumb" src="' + vd.thumb + '">';
      data.title = vd.title;
      data.text = vd.desc;
      data.videoUrl = vd.url;
  	 } else {
      data.node = '<p id="thumb" class="warning">No thumbnail and description.<br>' +
  	 	            'Video data not found.</p>';
  	   data.title = document.title;
  	   data.text = "";
  	   data.videoUrl = data.url;
  	 }
    data.video = true;
  }
  
  self.postMessage(data);
  
});
