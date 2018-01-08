(function(){
  function QueryMaker() {
	  var floor = Math.floor;
	  var abs = Math.abs;
	  var max = Math.max;
	  var min = Math.min;
	  var round = Math.round;
	  var sqrt = Math.sqrt;
	  var _this_ = this;
	  this.queries = {};
	  this.hooks = {};
	  this.perform = {};
	  this.pending = [];
	  this.fetched = undefined;
	  this.quirks = {};
	  this.err = undefined;
	  this.render = render;
	  /*THRESHOLDS*/
	  this.timeStampThreshold = 1300;
	  this.timeFalloutThreshold = 3000;
	  this.distanceThreshold = 24;
	  this.timeoutDuration = 300;
	  function render(D) {
		  for (var i=0;i<D.length;++i){
			initiate(D[i],i);
		  }
	  }
	  function initiate(Di,index) {
		//if(!("data" in Di) || !("length" in Di.data) || !Di.data.length){return}
		var dimensions = typeof Di.allot === "object" ? expandArray(Di.allot,Di.data.length) : undefined;
		dimensions ? dimensions._sum_ = dimensions.slice().reduce(function(acc,d,i){return acc+d}) : void(0);
		var container = Di.containerID.match(/^#/gi) ? d3.select(Di.containerID) : d3.select("#"+Di.containerID);
		var subDivID = Di.subName && Di.subName !== "" ? Di.containerID.replace("#","")+Di.subName : null;
		var preSelect = document.querySelector("#"+container.node().id+" div.queryMakerWrapper[queryID='"+Di.queryID+"']");
		var subDiv = preSelect ? d3.select(preSelect) : container
		.append("div")
		.attr("queryID",Di.queryID)
		.append("div")
		.attr("queryID",Di.queryID)
		.each(function(){
			var options = _this_.quirks.passiveSupported ? {capture:false, passive:false} : false;
			//disable scroll
			this.addEventListener("mouseenter",fisheyeActivator,options);
			this.addEventListener("touchstart",fisheyeActivator,options);
			
			this.addEventListener("mousemove",throttleFisheye.bind(this,dimensions),options);
			this.addEventListener("touchmove",throttleFisheye.bind(this,dimensions),options);
			this.parentNode.addEventListener("mouseout",_QueryMakerMasterDefaultMousemout_.bind(this),options);	
			this.parentNode.addEventListener("touchend",_QueryMakerMasterDefaultMousemout_.bind(this),options);
			
			//reEnable scroll
			//this.parentNode.addEventListener("touchend",enableScroll,options);
		});
		
		refreshMaster();
		
		refreshWrapper();
		
		var selection = subDiv.selectAll(".queryMakerUnit[queryID='"+Di.queryID+"']").data(Di.data,function(d,i){return Di.joinById ? d._id : i;});
		
		selection
		.enter()
		.append("div")
		.attr("queryID",Di.queryID)
		
		selection
		.sort(function(a,b){return Di.data.indexOf(a)-Di.data.indexOf(b);})
		.each(function(d,i){
			configureUnitContent.bind(this)(d,i);
		})
		.transition()
		.style("height",function(d,i){
			var height; 
			if(Di.orientation.match(/row/gi)){
				height = 100; 
				this._height_ = height;
				return "100%";
			}
			if(dimensions) {
				height = 100*dimensions[i]/dimensions._sum_;
			} else {
				height = 100/Di.data.length;
			}
			this._height_ = height;
			return height+"%";
		})
		.style("width",function(d,i){
			var width; 
			if(Di.orientation.match(/column/gi)){
				width = 100; 
				this._width_ = width; 
				return "100%"
			}
			if (dimensions) {
				width = 100*dimensions[i]/dimensions._sum_;
			} else {
				width = 100/(Di.data.length); 
			}
			this._width_ = width; 
			return width+"%";
		})
		.style("opacity",function(){return 1;})
		.each("end",function(d,i){
			loadComplete(this,d,i);
		})
		.delay(0)
		.duration(0);
		
		selection.exit().each(function(d,i){getClosestMasters(this.parentNode.parentNode,this).forEach(function(d,i){d.flush();})}).remove();
		
		function refreshMaster() {
			d3.select(subDiv.node().parentNode)
			.attr("id",subDivID)
			.attr("class",function(){return "orientation"+Di.orientation+" location"+Di.location+" size"+Di.size+" queryMakerMaster"})
			.property("fetch",function(){return function(type,index){type = type || "input"; var result = [];d3.select(this).selectAll(type).each(function(d,i){result[i] = this;}); return _this_.fetched = typeof(index) === "number" || index ? (index === "last" || index >= result.length ? result[result.length-1] : result[index]) : result;}})
			.property("fadeout",function(){return function(){d3.select(this).selectAll(".queryMakerUnit[queryID='"+Di.queryID+"']").transition().each("end",function(){d3.select(this).classed((function(){return Di.fadeType || "_transparent_"})(),true).classed("_hidden_",true);this === this.parentNode.parentNode.fetch(".queryMakerUnit[queryID='"+Di.queryID+"']",0) ? (d3.select(this.parentNode.parentNode).classed("_hidden_",true),fireEvent("onFadeout")) : void(0);}).delay(function(d,i){return (Di.data.length-1-i)*50;}).duration(0);}})
			.property("fadein",function(){return function(){d3.select(this).selectAll(".queryMakerUnit[queryID='"+Di.queryID+"']").transition().each("end",function(){d3.select(this).classed((function(){return Di.fadeType || "_transparent_"})(),false).classed("_hidden_",false);this === this.parentNode.parentNode.fetch(".queryMakerUnit[queryID='"+Di.queryID+"']",0) ? (d3.select(this.parentNode.parentNode).classed("_hidden_",false),fireEvent("onFadein")) : void(0);}).delay(function(d,i){return (i)*50;}).duration(0);}})
			.property("fadeaway",function(){return function(delay){
				//getClosestMasters(this).forEach(function(d,i){d.fadeaway(delay/2)}); the idea was to trigger fadeaway on descendant masters but manual fadeaways might be attached to those
				//getClosestMasters(this).forEach(function(d,i){flushMaster(d);}); Moved to flush property
				
				//ORIGINAL - d3.select(this).selectAll(".queryMakerUnit[queryID='"+Di.queryID+"']").transition().each("end",function(){d3.select(this).classed((function(){return Di.fadeType || "_transparent_"})(),true).classed("_hidden_",true);this === this.parentNode.parentNode.fetch(".queryMakerUnit[queryID='"+Di.queryID+"']","last") ? setTimeout((function(){d3.select(this.parentNode.parentNode).remove(); fireEvent("onKilled"); delete _this_.queries[Di.queryID]; delete _this_.perform[Di.queryID]; delete _this_.hooks[Di.queryID]; /*fireEvent("onKilled");*/}).bind(this),delay) : void(0);}).delay(function(d,i){return (Di.data.length-1-i)*50;}).duration(0);}})
				d3.select(this).selectAll(".queryMakerUnit[queryID='"+Di.queryID+"']").transition().each("end",function(){d3.select(this).classed((function(){return Di.fadeType || "_transparent_"})(),true).classed("_hidden_",true);this === this.parentNode.parentNode.fetch(".queryMakerUnit[queryID='"+Di.queryID+"']","last") ? setTimeout((function(){fireEvent("onKilled"); this.parentNode.parentNode.flush();}).bind(this),delay) : void(0);}).delay(function(d,i){return (Di.data.length-1-i)*delay/Di.data.length;}).duration(0);}})
			.property("perform",function(){return function(){_this_.perform[Di.queryID] ? _this_.perform[Di.queryID].forEach(function(d,i){(d())();}) : void(0); fireEvent("onPerform");}})
			.property("flush",function(){return function(){flushMaster(this); getClosestMasters(this).forEach(function(d,i){d.flush();})}});
		}
		
		function refreshWrapper () {
			subDiv.attr("class",function(){return "orientation"+Di.orientation+" queryMakerWrapper"}).property("_childrenCount_",Di.data.length).property("_magnify_",Di.magnify !== undefined && !Di.magnify ? undefined : Di.magnify).property("_magnifyRange_",Di.magnifyRange || 3).property("_magnifyDecayConstant_",Di.magnifyDecayConstant || 1).property("_orientation_",Di.orientation);
			preSelect ? void(0) : _this_.queries[Di.queryID] = subDiv.node().parentNode,registerHooks();
		}
		
		function registerHooks () {
			_this_.hooks[Di.queryID] = {};
			_this_.hooks[Di.queryID].onLoad = Di.onLoad ? Di.onLoad.slice() : [];//js,json or property
			_this_.hooks[Di.queryID].onKilled = Di.onKilled ? Di.onKilled.slice() : [];//
			_this_.hooks[Di.queryID].onFadein = Di.onFadein ? Di.onFadein.slice() : [];
			_this_.hooks[Di.queryID].onFadeout = Di.onFadeout ? Di.onFadeout.slice() : [];
			_this_.hooks[Di.queryID].sync = Di.sync ? Di.sync.slice() : [];
			_this_.hooks[Di.queryID].rSync = Di.rSync ? Di.rSync.slice() : [];
			_this_.hooks[Di.queryID].onPerform = Di.onPerform ? Di.onPerform.slice() : [];
			/*Fisheye - only JS object, not a JSON formatted file*/
			var wrapper = subDiv.node(),
				master = wrapper.parentNode,
				children = wrapper.children, /*using Array.prototype.slice.call will loose the 'live' nature*/
				temp;
			_this_.hooks[Di.queryID].onFisheye = Di.onFisheye 
				? (
					temp = Di.onFisheye.slice().map(function(d,i){
						return d.bind(master,wrapper,children);
					}), 
					master._onFisheye = function(){
						for(var i = 0; i<temp.length;++i){
							temp[i]();
						}
					}
				  )
				: [];
		}
		
		function loadComplete (that,d,i) {
		  //LOAD COMPLETE
		  var unit = d3.select(that);
		  i === Di.data.length-1 ? 
		  unit.append("div")
		  .attr("class","_loadChecker_")
		  .on("click",function(){
			  d3.event.stopPropagation();
			  fireEvent("onLoad");
			  d3.select(this).remove();
		  })
		  .node().click()
		  :void(0);
		}
		
		function fireEvent(type) {
			_this_.hooks[Di.queryID][type].forEach(function(d,i){
				parseOpt(d,i);
			})
		}
		
		function parseOpt (d,i) {
			var propArray = ["fetch","fadeout","fadein","fadeaway","perform"];
			var master =  _this_.queries[Di.queryID];
			try {
				if (d[0].match(/^.*\.js$/i)) {
					loadScript(d);
				} else if (d[0].match(/^.*\.json$/i)) {
					_this_.load.apply(_this_,d);
				} else if (!~propArray.indexOf(d[0])) {
					_this_.queries[d[0]] ? _this_.queries[d[0]][d[1]].apply(_this_.queries[d[0]],d.slice(2)) : void(0);
				} else {
					master[d[0]].apply(master,d.slice(1));
				}
			}
			catch (err) {
				_this_.err = err;
				console.log(err.message);
			}
		}
		
		function configureUnitContent(d,i){
		  //eventhandlers
		  /*this.addEventListener("mouseover",_QueryMakerUnitDefaultMouseOver_,false); -only used for .hover, let the for loop handle this*/
		  /*this.addEventListener("mouseout",_QueryMakerUnitDefaultMouseOut_,false); -only used for .hover, let the for loop handle this*/
		  this.addEventListener("click",_QueryMakerUnitDefaultClick_,false);
		  //rest
		  var unit = d3.select(this);
		  unit
		  .attr("class","orientation"+Di.orientation+" queryMakerUnit")
		  .classed("top",function(){return i===0 && Di.orientation.match(/column/gi)?true:false})
		  .classed("bottom",function(){return i===Di.data.length-1 && Di.orientation.match(/column/gi)?true:false})
		  .classed("left",function(){return i===0 && Di.orientation.match(/row/gi)?true:false})
		  .classed("right",function(){return i===Di.data.length-1 && Di.orientation.match(/row/gi)?true:false});
		  //clear children
		  while(this.hasChildNodes()){
			  this.removeChild(this.lastChild);
		  }
			
		  var widgets = _initWidget_(d.widgetType || Di.widgetType,unit);
		  //console.log(widgets);
		  for (var component in widgets){
			  //console.log(widgets[component]);
			  widgets[component](d,i);
		  }
		}
		
		function _initWidget_ (widgetType,unit) {
		  var mainSelectorString = "input[queryID='"+Di.queryID+"']"+","+"img[queryID='"+Di.queryID+"']"+","+"div.queryMakerCarrier[queryID='"+Di.queryID+"']";
		  var widgetTypes = {
			  get _default_(){ return this.query},
			  "query":{
				  get addLabel() {delete this.addLabel; return this.addLabel = addLabel.bind(unit);},
				  get addInput() {delete this.addInput; return this.addInput = addInput.bind(unit);},
				  get addHighlight() {delete this.addHighlight; return this.addHighlight = addHighlight.bind(unit);}
			  },
			  "image":{
				  get addImage() {delete this.addImage; return this.addImage = addImage.bind(unit);},
				  get addHighlight() {delete this.addHighlight; return this.addHighlight = addHighlight.bind(unit);}
			  },
			  "carrier":{
				  get addCarrier() {delete this.addCarrier; return this.addCarrier = addCarrier.bind(unit);},
				  get addHighlight() {delete this.addHighlight; return this.addHighlight = addHighlight.bind(unit);}
			  }
		  }
		  //console.log(widgetTypes["_default_"]);
		  return widgetTypes[widgetType || "_default_"];
		  
		 function addLabel(/*this=unit,*/d,i) {
			  this.append("label")
			  .attr("for",function(){
				return subDivID ? subDivID+"_"+i : Di.containerID.replace("#","")+"_"+index+"_"+i
			  })
			  .attr("class","queryMakerLabel")
			  .attr("queryID",Di.queryID)
			  .text(function(){return d.label ? d.label : ""})
			  .classed("noLabel",function(){return !d.label})
			  .classed("blurred",function(){return d.prepend !== "" && typeof d.prepend !== "boolean" && d.prepend ? true : false})
			  .each(function(){
				  //eventhandlers
				  this.addEventListener("click",_QueryMakerLabelDefaultClick_,false)
			  });
		  }
		  function addInput(/*this=unit,*/d,i){
			 this.append("input")
			  .attr("id",function(){
				return subDivID ? subDivID+"_"+i : Di.containerID.replace("#","")+"_"+index+"_"+i
			  })
			  .attr("class",function(){return "queryMakerInput"})
			  .classed("noLabel",function(){return !d.label})
			  .classed("prepended",function(){return !!d.prepend})
			  .attr("queryID",Di.queryID)
			  .attr("type","text")//text default
			  .property("_clickCount_",0)
			  .property("value",function(){return d.prepend && typeof d.prepend !== "boolean" ? d.prepend : ""})
			  .property("_deactivated_",true)
			  .property("deactivate",function(){return function(){
				var that = this;
				this._deactivated_ = true;
				d3.select(this).classed("active",false);
				d3.select(this.previousSibling).classed("blurred",function(){return that.value === "" || that.value === undefined  ? false : true;}).classed("active",false);
				d3.select(this.nextSibling).classed("active",false);
			  }})
			  .property("activate",function(){ return function(){
				var that = this;
				this._deactivated_ = false;
				d3.select(this).classed("active",true);
				d3.select(this.previousSibling).classed("blurred",false).classed("active",true);
				d3.select(this.nextSibling).classed("active",true);
				d3.selectAll(mainSelectorString).filter(function(){return this!==that}).each(function(){this._deactivated_ ? void(0) : this.deactivate();})
			  }})
			  .each(function(){
				  //eventhandlers
				  this.addEventListener("blur",_QueryMakerInputDefaultBlur_,false);
				  this.addEventListener("click",_QueryMakerInputDefaultClick_,false);
				  //rest
				for (var field in d) {
				  field.match(/^attr/) ? this.setAttribute(field.replace(/^attr/,"").toLowerCase(),d[field]) : void(0);
				  field.match(/^prop/) ? this[field.replace(/^prop/,"").toLowerCase().replace(/-\w{1}/gi,function(m,o,s){return m.slice(1).toUpperCase()})] = d[field] : void(0);
				  field.match(/^prepend$/gi) ? (function(field){var _this_ = this; /*console.log(_this_._onkeydown_);*/ this.removeEventListener("keydown",_this_._onkeydown_,false);this.addEventListener("keydown",_this_._onkeydown_ = _QueryMakerInputDefaultKeydown_.bind(_this_,field),false)}).bind(this)(typeof d[field] !== "boolean" ? d[field] : "") : void(0);
				}
			  })
		  }
		  function addImage(/*this=unit,*/d,i) {
			  this.append("img")
			  .attr("id",function(){
				return subDivID ? subDivID+"_"+i : Di.containerID.replace("#","")+"_"+index+"_"+i
			  })
			  .attr("class",function(){return "queryMakerImg"})
			  .attr("queryID",Di.queryID)
			  .property("_clickCount_",0)
			  .property("_deactivated_",true)
			  .property("deactivate",function(){return function(){
				var that = this;
				this._deactivated_ = true;
				d3.select(this).classed("active",false);
				d3.select(this.nextSibling).classed("active",false);
			  }})
			  .property("activate",function(){ return function(){
				var that = this;
				this._deactivated_ = false;
				d3.select(this).classed("active",true);
				d3.select(this.nextSibling).classed("active",true);
				d3.selectAll(mainSelectorString).filter(function(){return this!==that}).each(function(){this._deactivated_ ? void(0) : this.deactivate();})
			  }})
			  .each(function(){
				  //eventhandlers
				  this.addEventListener("click",_QueryMakerImgDefaultClick_,false);
				  //rest
				for (var field in d) {
				  field.match(/^attr/) ? this.setAttribute(field.replace(/^attr/,"").toLowerCase(),d[field]) : void(0);
				  field.match(/^prop/) ? this[field.replace(/^prop/,"").toLowerCase().replace(/-\w{1}/gi,function(m,o,s){return m.slice(1).toUpperCase()})] = d[field] : void(0);
				}
			  })
		  }
		  function addCarrier(/*this=unit,*/d,i) {
			  this.append("div")
			  .attr("id",function(){
				return subDivID ? subDivID+"_"+i : Di.containerID.replace("#","")+"_"+index+"_"+i
			  })
			  .attr("class",function(){return "queryMakerCarrier"})
			  .attr("queryID",Di.queryID)
			  .property("_clickCount_",0)
			  .property("_deactivated_",true)
			  .property("deactivate",function(){return function(){
				var that = this;
				this._deactivated_ = true;
				d3.select(this).classed("active",false);
				d3.select(this.nextSibling).classed("active",false);
			  }})
			  .property("activate",function(){ return function(){
				var that = this;
				this._deactivated_ = false;
				d3.select(this).classed("active",true);
				d3.select(this.nextSibling).classed("active",true);
				d3.selectAll(mainSelectorString).filter(function(){return this!==that}).each(function(){this._deactivated_ ? void(0) : this.deactivate();})
			  }})
			  .each(function(){
				  //eventhandlers
				  this.addEventListener("click",_QueryMakerCarrierDefaultClick_,false);
				  //rest
				for (var field in d) {
				  field.match(/^attr/) ? this.setAttribute(field.replace(/^attr/,"").toLowerCase(),d[field]) : void(0);
				  field.match(/^prop/) ? this[field.replace(/^prop/,"").toLowerCase().replace(/-\w{1}/gi,function(m,o,s){return m.slice(1).toUpperCase()})] = d[field] : void(0);
				}
			  })
		  }
		  function addHighlight (/*this=unit,*/d,i) {
			 this.append("div")
			  .attr("class","queryMakerHighlight")
			  .attr("queryID",Di.queryID)
			  .classed("noHighlight",function(){return typeof Di.highlight !== "undefined" && !Di.highlight})
			  .classed("default",true)
			  .classed("alternate",function(){return String(Di.highlight).match(/alternate/i)});
		  }
	    }
	  }
	  
	  this.loadScript = loadScript;
	  
	  function loadScript (d) { //['./someFile.js',{passive:false,selector:'someSelector',refresh:true}]
		var root = d[0];
		var config = d[1] || {passive:false,selector:"head",refresh:true};
		var existingScript = document.querySelector("script[src*='"+root+"']");
		if(existingScript) {
			if(!config.passive) {
				d3.select(existingScript).remove()
			} else {
				return;
			}
		}
		cacheBust = config.refresh ? "?"+((new Date()).getTime()) : "";
		if(config.selector) {
			d3.select(config.selector).append("script").attr("src",root+cacheBust);
		} else {
			d3.select(document.getElementsByTagName("head")[0]).append("script").attr("src",root+cacheBust);
		}
	  }
	  function expandArray (arr,len,f) {
		f = f || function(x){return x};
		var expanded = [];
		var length = arr.length;
		for (var t = 0, i = 0, step = 1/len,transformed = f(t);t<=1;++i,t = i*step,transformed = f(t)) {
			expanded[round(t*(len-1))] = arr[round(transformed*(length-1))];
		}
		return expanded;
	  }
	  function _QueryMakerInputDefaultKeydown_ (field,e){//do not use e.code here
		  var deletePressed = confirmDelete(e);
		  //var characterPressed = (new RegExp(e.key,"i")).test(String.fromCharCode(e.keyCode)) ?  e.key : ""; good but too much
		  var characterPressed = e.key.length <= 1 ? e.key : "";
		  if(this.value === field && deletePressed){
			  e.preventDefault();
			  return;
		  } 
		  if(this.selectionStart !== this.selectionEnd) {
			  e.preventDefault();
			  this.value = this.value.slice(0,Math.max(field.length,this.selectionStart))+(deletePressed ? "" : characterPressed)+this.value.slice(this.selectionEnd);
		  }
		  var prepend = new RegExp(field,"i");
		  this.value = field+this.value.replace(prepend,"");
	  }
	  function _QueryMakerUnitDefaultMouseOver_(){
		  //d3.select(this).classed("hovered",true);
		  refreshHover(this.parentNode.parentNode,this);
	  }
	  function _QueryMakerUnitDefaultMouseOut_(){
		  //d3.select(this).classed("hovered",false);
		  refreshHover(this.parentNode.parentNode);
	  }
	  function _QueryMakerUnitDefaultClick_(){
		  var node = d3.select(this).select("input,img,div.queryMakerCarrier").node();
		  node.click();
		  node.focus();
	  }
	  function _QueryMakerLabelDefaultClick_(evt){
		  evt.preventDefault();
	  }
	  function _QueryMakerInputDefaultBlur_(){
		  this.deactivate();
	  }
	  function _QueryMakerInputDefaultClick_(e){
		  e.stopPropagation();this.activate();this._clickCount_ = ++this._clickCount_%2; this.checked = this._clickCount_ === 1 ? true : false; this.focus();
	  }
	  function _QueryMakerImgDefaultClick_(e){
		  e.stopPropagation();this._clickCount_ = ++this._clickCount_%2; this.checked = this._clickCount_ === 1 ? (this.activate(),true) : (this.deactivate(),false);
	  }
	  function _QueryMakerCarrierDefaultClick_(e){
		  e.stopPropagation();this._clickCount_ = ++this._clickCount_%2; this.checked = this._clickCount_ === 1 ? (this.activate(),true) : (this.deactivate(),false);
	  }
	  function _QueryMakerWrapperDefaultMousemove_(thisArg,dimensions,e,currentTarget){
		 var magnify = thisArg._magnify_;
		 if(!magnify){return}
		 
		 if(!thisArg._fishEyeStarted) {
			 //console.log("thisArg._fishEyeStarted");
			 if(thisArg._fishEyeFlagSet){
				 //console.log("thisArg._fishEyeFlagSet");
				 if(passedMoreThan(thisArg,e,_this_.timeFalloutThreshold)) {
					//console.log("passedMoreThan-1");
					 resetFlow(e,thisArg,_this_.timeoutDuration);
					 return;
				 } else {
					 if(movedMoreThan(thisArg,e,_this_.distanceThreshold)) {
						 //console.log("movedMoreThan-1");
						 resetFlow(e,thisArg,_this_.timeoutDuration);
						 return;
					 } else {
						 if(passedMoreThan(thisArg,e,/*_this_.timeoutDuration*/_this_.timeStampThreshold)) {
							 //console.log("passedMoreThan-2");
							 hideFishEyeSpinner ();
							 disableScroll(e);
							 thisArg._fishEyeStarted = true;
						 } else {
							 //console.log("failed");
							 thisArg._fishEyeBusy = false;
							 return;
						 }
					 }
				 }
			 } else {
				 if(movedMoreThan(thisArg,e,_this_.distanceThreshold)) {
					 //console.log("movedMoreThan-2");
					 resetFlow(e,thisArg,_this_.timeoutDuration);
					 return;
				 } else {
					 //console.log("failed-2");
					 thisArg._fishEyeBusy = false;
					 return;
				 }
			 }
		 }
		 
		 var master = thisArg.parentNode;
		 d3.select(thisArg).classed("_fisheye_",true);
		 var placeholder;
		 var posX = (placeholder = e.clientX) !== undefined ? placeholder : e.touches[0].clientX;
		 var posY = (placeholder = e.clientY) !== undefined ? placeholder : e.touches[0].clientY;
		 var children = thisArg.children;
		 var childrenCount = thisArg._childrenCount_;
		 var dim = thisArg._orientation_ === "Row" ? "width" : "height";
		 var _dim_ = thisArg._orientation_ === "Row" ? "_width_" : "_height_";
		 var customDim = dimensions ? childrenCount/dimensions._sum_ : undefined;
		 var bRect = (e.currentTarget || currentTarget).parentNode.getBoundingClientRect();
		 var bWidth = bRect.width;
		 var bHeight = bRect.height;
		 var bLeft = bRect.left;
		 var bTop = bRect.top;
		 var unitDim = dim === "width" ? bWidth/childrenCount : bHeight/childrenCount;
		 var α = unitDim*magnify/2;
		 var β = dim === "width" ? bWidth-α : bHeight-α;
		 var γ = dim === "width" ? max(α,min(posX-bLeft,β)) : max(α,min(posY-bTop,β));
		 var offset = dim === "width" ? (γ-α)/(β-α)*bWidth : (γ-α)/(β-α)*bHeight;
		 var currentUnitPos = offset/unitDim;
		 var currentIndex = floor(currentUnitPos);
		 var range = thisArg._magnifyRange_;
		 for(var Lp = 0,L = 0, i = currentUnitPos-range,index = floor(i), fraction = i-index, distance = abs(index+0.5-currentUnitPos),coef = max(1,magnify*(1-distance/range));i<=currentUnitPos+range;++i,index = floor(i),distance = abs(index+0.5-currentUnitPos),coef = max(1,magnify*(1-distance*thisArg._magnifyDecayConstant_/range))){
			 //console.log("currentIndex: " + currentIndex + ",currentUnitPos:" + currentUnitPos + ",index:" + index + ",i:" + i);
			 if(index===0&&currentUnitPos < 1) {
				var subject = children[max(0,index)];
				//subject.classList.add("hovered");
				refreshHover(master,subject);
				subject.style[dim] = subject[_dim_]*coef+"%";
				var allot = dimensions ? dimensions[max(0,index)]*customDim : 1;
				L += fraction*allot;
				Lp += coef*fraction*allot;
				continue;
			 }
			 if(index >= 0 && index < currentUnitPos && Math.round(i*10000)/10000 !== Math.round(currentUnitPos*10000)/10000) {
				var subject = children[index];
				//subject.classList.remove("hovered");
				//refreshHover(master);
				subject.style[dim] = subject[_dim_]*coef+"%";
				var allot = dimensions ? dimensions[index]*customDim : 1;
				L += 1*allot;
				Lp += coef*allot;
				continue;
			 }
			 if (Math.round(i*10000)/10000 === Math.round(currentUnitPos*10000)/10000) {
				//console.log("children count:" + childrenCount+",index: "+index );
				var subject = children[min(index,childrenCount-1)];
				//subject.classList.add("hovered");
				//console.log("Im marking:" + index);
				refreshHover(master,subject);
				subject.style[dim] = subject[_dim_]*coef+"%";
				var allot = dimensions ? dimensions[min(index,childrenCount-1)]*customDim : 1;
				L += fraction*allot;
				Lp += coef*fraction*allot;
				continue;
			 }
			 if(index > currentIndex && index < childrenCount) {
				var subject = children[index]; 
				//subject.classList.remove("hovered");
				//refreshHover(master);
				subject.style[dim] = subject[_dim_]*coef+"%";
				continue;
			 }
		 }
		 dim === "width" ? thisArg.style.left = -(Lp-L)*unitDim+"px" : thisArg.style.top = -(Lp-L)*unitDim+"px";
		 //this.style.transform = dim === "width" ? "translate("+(-(Lp-L)*unitDim+"px")+",0px)" : "translate(0px,"+(-(Lp-L)*unitDim+"px")+")";
		 thisArg._fishEyeBusy = false;
	  }
	  function throttleFisheye(dimensions,e){
		  //console.log("dimensions are "+dimensions);
		  //console.log(e.currentTarget);
		  //console.log(this);
		  var that = this;
		  var currentTarget = e.currentTarget;
		  if(!this._fishEyeBusy){
			  this._fishEyeRequestID = window.requestAnimationFrame(
				function(){
					_QueryMakerWrapperDefaultMousemove_(that,dimensions,e,currentTarget)
				}
			  );
		  }
		  this._fishEyeBusy = true;
	  }
	  function _QueryMakerMasterDefaultMousemout_(e){//this refers to the Wrapper element
		 if (e.type === "touchend") {
			  this._fishEyeTerminatedByTouchEnd = true;
		  } else if (e.type === "mouseout" && this._fishEyeTerminatedByTouchEnd) {
			  this._fishEyeTerminatedByTouchEnd = false;
			  return;
		  }
		 if(e.currentTarget.contains(e.relatedTarget)){return}
		 var master = this.parentNode;
		 window.cancelAnimationFrame(this._fishEyeRequestID);
		 d3.select(this).classed("_fisheye_",false);
		 var magnify = this._magnify_;
		 if(!magnify){return}
		 var children = this.children;
     	 var childrenCount = this._childrenCount_;
		 var dim = this._orientation_ === "Row" ? "width" : "height";
		 var _dim_ = this._orientation_ === "Row" ? "_width_" : "_height_";
		 var length = this.children.length;
		 for(var i = 0;i<length;++i){
			 children[i].style[dim] = children[i][_dim_]+"%";
			 //children[i].classList.remove("hovered");
		 }
		 dim === "width" ? this.style.left = "0px" : this.style.top = "0px";
		 //this.style.transform = "translate(0px,0px)";
		 this._fishEyeBusy = false;
		 
		 hideFishEyeSpinner();
		 /*console.log("IMPORTANT");
		 console.log(e);
		 console.log(e.currentTarget);
		 console.log(e.relatedTarget);*/
		 enableScroll(e,this);
		 setTimeout(function(){refreshHover(master)},300);
	  }
	  function refreshHover (master,node) {
		  /*console.log("master\n");
		  console.log(master);
		  console.log("node\n");
		  console.log(node);*/
		  var previous = master.hovered;
		  previous ? (previous.classList.remove("hovered"),master.hovered = undefined, master._onFisheye && master._onFisheye()) : void(0);
		  node ? (master.hovered = node, node.classList.add("hovered"),master._onFisheye && master._onFisheye()) : void(0);
	  }
	  function confirmDelete(e){
		  /*console.log("key:"+e.key);console.log("code:"+e.code);console.log("which:"+e.which);console.log("keyCode:"+e.keyCode);console.log("charCode:"+e.charCode);*/
		  //IM DROPPIG SUPPORT FOR THE NUMERICAL PROPERTIES. THEY ARE JUST A MESS. ORIGINAL CODE BELOW
		  /*if(e.key === "Delete" || e.code === "Delete" || e.which === 112 || e.keyCode === 112 || e.charCode === 112) {
			  return true;
		  } else if (e.key === "Backspace" || e.code === "Backspace" || e.which === 67 || e.keyCode === 67 || e.charCode === 67) {
			  return true;
		  }*/
		  if(e.key === "Delete" || e.code === "Delete" || e.key === "Backspace" || e.code === "Backspace") {
			  return true;
		  }
		  return false;
	  }
	  this.register = function(queryID,f,args){
		  var _args_ = Array.prototype.slice.call(arguments,2);
		  var arr = queryID in this.perform ? this.perform[queryID] : this.perform[queryID] = []; 
		  var functor = function() {
			_this_.perform[queryID] = arr.filter(function(d,i){return d !== functor});
			return Function.prototype.bind.apply(f,[_this_.queries[queryID]].concat(_args_));
		  }
		  this.perform[queryID].push(functor);
		  return this;
	  }
	  this.gif = function(gif){this.gif._gif_ = gif;return this;}
	  this.gif._gif_ = "data:image/gif;base64,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AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
	  this.container = function(container){this.container._container_ = container;return this;}
	  this.container._container_ = document.body;
	  this.load = function load(file,css,js) {
		var obj = undefined;
		this.pending.filter(function(d,i){d.validate(file,css,js) === true}).length === 0 
		? (obj = new loadObj(file,css,js),this.pending.push(obj),obj.send())
		: void(0);
		
		function loadObj (file,css,js){
			var that = this;
			this.file = file;
			this.css = css;
			this.js = js;
			this.validate = function(file,css,js){return file === this.file && css === this.css && js === this.js};
			this._retryCount_ = 0;
			this.send = function(){
				var xhttp = new XMLHttpRequest();
				xhttp.onreadystatechange = function() {
					if (xhttp.readyState === 1 && !this._alreadyInitiated_) {
						this._alreadyInitiated_ = true;
						console.log("Starting loading "+file);
						var preSelect = that.img || d3.select(_this_.container._container_).select("img._loading_").node();
						that.img = preSelect ? d3.select(preSelect) : d3.select(_this_.container._container_).append("img").attr("class","_loading_").style("position","fixed").style("top","50%").style("left","50%").style("transform","translate(-50%,-50%)").style("-ms-transform","translate(-50%,-50%)").style("height","auto").style("max-width","5%").style("z-index",-(1 << 31)-1).attr("src",_this_.gif._gif_).attr("alt","Loading..");
					}
					if (xhttp.readyState == 4 && xhttp.status == 200) {
						css && !document.querySelector("link[href*='"+css+"']") ? d3.select(document.getElementsByTagName("head")[0]).append("link").attr("rel","stylesheet").attr("type","text/css").attr("href",css+"?"+((new Date()).getTime())) : void(0);
						render(JSON.parse(xhttp.responseText));
						_this_.pending = _this_.pending.filter(function(d,i){return d !== that});
						_this_.pending.filter(function(d,i){return d.img === that.img}).length === 0 ? that.img.remove() : void(0);
						console.log("loading "+file+" complete.");
						//return _this_;
					}
					if(xhttp.readyState == 4 && xhttp.status !== 200) {
						++that._retryCount_;
						that._retryCount_ < 3 ? (console.log("Retrying with retry count: "+that._retryCount_),that.send()) : console.log("Tried loading "+file+" 3 times. Ajax request failed.");
						//return _this_;
					}
				}
				xhttp.onload = function(){
					if(xhttp.status == 200) {
						console.log("Ajax request succesfull for "+that.file);
					} else {
						console.log("Ajax failed with status of "+xhttp.status);
					}
				}
				xhttp.onerror = function() {
					console.log("Ajax request rejected for "+that.file);
				}
				xhttp.open("GET", file+"?"+((new Date()).getTime()), true);
				xhttp.setRequestHeader("Content-type", "text/plain");
				xhttp.send();
			}
		}
		
		return this;
	  }
	  //disable iOS touchmove
	  function disableScroll(event){
		if(!document._ScrollLocked){
			document.body.classList.add("lock-scroll"); 
			document._ScrollLocked = true;
		};
		/*if(!document.__queryMakerScrollCancel){
			document.__queryMakerScrollCancel = function(event){
				if(!event.cancelable) {
					return
				} else {
					event.preventDefault();
				}
			}
		}
		document.body.addEventListener("touchmove",document.__queryMakerScrollCancel, _this_.quirks.passiveSupported ? {capture:false, passive:false} : false);
		document._mobileScrollPrevented = true;*/
	  }
	  //reEnable iOS touchmove
	  function enableScroll(event,node){
		//event.stopPropagation(); //You do not need it here
		//event.changedTouches[0].target.click(); //this is to stimulate click,otherwise it will be suppressed coz of preventdefault on touchstart - ALTERNATIVE 1: CLICKS ON EVENT TARGET
		
		document.body.classList.remove("lock-scroll");
		document._ScrollLocked = false;
		
		document.body.removeEventListener("touchmove",document.__queryMakerScrollCancel, _this_.quirks.passiveSupported ? {capture:false, passive:false} : false);
		document._mobileScrollPrevented = false;
		
		node._fishEyeStarted = false;
		
		clearTimeout(node._fishEyeTimeout);
		node._fishEyeFlagSet = false;
	  }
	  function resetFlow (event,node,t) {
		  node._fishEyeTimeout = resetFisheye(event,node,t);
		  node._fishEyeBusy = false;
	  }
	  function resetFisheye (event,node,t) {
		  node._fishEyeFlagSet = false;
		  //TODO - remove animation if any
		  hideFishEyeSpinner();
		  clearTimeout(node._fishEyeTimeout);
		  addTimeStamp(event,node);
		  addStartCoord(event,node);
		  return setTimeout(function(){
			//console.log("fuuucccck!!");
			node._fishEyeFlagSet = true;
			addTimeStamp(event,node);
			//TODO - animation();
			addFishEyeSpinner (event,t)
		  },t)
	  }
	  function addFishEyeSpinner (event,t) {
		var period = _this_.timeStampThreshold-t+16.67,//a tick more than what is needed
			eventXY = Comet.prototype.getEventXY(event),
			viewport = Comet.prototype.getViewportMetrics(event),
			offsetY = viewport.top > viewport.bot ? -1.2 : 0.2,
			offsetX = viewport.left > viewport.right ? -1.2 : 0.2,
			translate = "translate("+offsetX*100+"%,"+offsetY*100+"%)";
		if(document.body._queryMakerComet) {
			document.body._queryMakerComet
			.reset()
			.currentHandler
			.style("display","block")
			.style("transform",translate)
			.self
			.move(eventXY.x,eventXY.y)
			.color2("#ffff00")
			.period(period)
			.lineWidth(30)
			.start();
		} else {
			document.body._queryMakerComet = (new Comet)
			.resolution(500)
			.radius(220)
			.alpha(0.9)
			.alphaDecay(0.95)
			.color1("#ff0000")
			.color2("#ffff00")
			.append(document.body,function(){
				this.style("width","10%")
				.style("height","auto")
				.style("transform",translate)
				.style("top",0)
				.style("left",0)
				.style("zIndex",99)/*1 less than the z-index of the 'Working' Screen in main.css of Mutaframe Project*/
			})
			.lineCap("round")
			.period(period)
			.oncomplete(function(){
				var that = this; 
				this.$_color2 !== "#00ff00" 
					? (this.color2("#00ff00").period(0).lineWidth(45),setTimeout(function(){that.start();},50)) 
					: void(0)
			})
			.iteration(1)
			.lineWidth(30)
			.move(eventXY.x,eventXY.y)
			.start();
		}
	  }
	  function hideFishEyeSpinner () {
		  document.body._queryMakerComet ?  document.body._queryMakerComet.reset().currentHandler.style("display","none") : void(0);
	  }
	  function fisheyeActivator (event,node) {
		  node = node || this;
		  if(node._fishEyeStarted){
			  return;
		  }
		  if (event.type === "touchstart") {
			  node._fishEyeActivatedByTouchEnd = true;
		  } else if (event.type === "mouseenter" && node._fishEyeActivatedByTouchEnd) {
			  node._fishEyeActivatedByTouchEnd = false;
			  return;
		  }
		  node._fishEyeTimeout = resetFisheye(event,node,_this_.timeoutDuration);
	  }
	  function addTimeStamp (event,node) {
		  node.timeStamp = Date.now();
	  }
	  function addStartCoord (event,node) {
		  var eventObj = event.targetTouches ? event.targetTouches[0] : event;
		  node.startCoord = [eventObj.clientX,eventObj.clientY];
	  }
	  function passedMoreThan(node,event,t) {
		   var timeStamp = Date.now();
		   return timeStamp - node.timeStamp > t;
	  }
	  function movedMoreThan(node,event,units){
		  var eventObj = event.targetTouches ? event.targetTouches[0] : event.changedTouches ? event.changedTouches[0] : event;
		  return getEucDistance(node.startCoord,[eventObj.clientX,eventObj.clientY]) > units;
	  }
	  function getEucDistance (p1,p2) {
		  var dx = p2[0] - p1[0];
		  var dy = p2[1] - p1[1];
		  return sqrt(dx * dx + dy * dy);
	  }
	  //run tests
	  (function(){
		  //DECLARE DEFAULTS
		  _this_.quirks.passiveSupported = false;
		  
		  //test 1 - check if passive supported
		  (function(){
			  var options = Object.defineProperty({},"passive",{
					get: function(){
						_this_.quirks.passiveSupported = true;
					}
			  })
			  window.addEventListener("queryMakerTest",null,options);
		  })();
	  })()
	  function getClosestMasters(node,scope){
		  scope = "nodeType" in (scope || {}) ? scope.contains : function(){return true};
		  return node.fetch(".queryMakerMaster").filter(function(d,i){return !getLevel(d) && scope(d)});
		  function getLevel(oNode){
			for (var level=0,cNode=oNode.parentNode;cNode !== node;cNode = cNode.parentNode) {
				d3.select(cNode).classed(".queryMakerMaster") ? ++level : void(0);
			}
			return level;
		  }
	  }
	  function flushMaster(node){
		  var queryID = node.getAttribute("queryID");
		  d3.select(node).remove(); delete _this_.queries[queryID]; delete _this_.perform[queryID]; delete _this_.hooks[queryID];
	  }
  }
  //var prt = QueryMaker.prototype;
  window.queryMaker = new QueryMaker();
})()
