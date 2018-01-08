# QueryMaker

Generates fish-eye zoomable HTML elements with synthetic events

This is the latest version of QueryMaker.js that I have used in the [**Gwentspector**](http://www.ibrahimtanyalcin.com/gwent/).

To use in the browser, you will need to provide the script and its cssRules:


```

<--Somewhere in the head-->

<link rel="stylesheet" type="text/css" href="./queryMaker.css"></link>

..

<--Before the closing body tag-->

<script src="./queryMaker.js" defer></script>

Any other script that depends on queryMaker till DOMContentLoaded event comes here

```

## Providing JSON configuration file

A typical configuration file looks like this:

```
[
    {
      "containerID":"gwent",
      "data":[
		{
		  "_id":"cRow_1",
		  "widgetType":"carrier"
        },
		{
		  "_id":"cRow_2",
		  "widgetType":"carrier"
        },
		{
		  "_id":"cRow_3",
		  "widgetType":"carrier"
        },
		{
		  "_id":"cRow_4",
		  "widgetType":"carrier"
        },
		{
		  "_id":"cRow_5",
		  "widgetType":"carrier"
        }
      ],
      "subName":"",
	  "location":"T2T2",
	  "size":"T3T3",
	  "queryID":"main",
	  "orientation":"Column",
	  "magnify":3,
	  "magnifyRange":2,
	  "joinById":true,
	  "highlight":false,
	  "onLoad":[["./queryMakerLoad.js"]],
	  "onKilled":[["./initLight.js"]]
    }
  ]
```

Above file saved somewhere as 0.json. You can also write css style for it and save it as 0.css. You can have as many different JSON config files as you want. The important thing is the **queryID** which in the above case is "main".

You conditionally load the config files you want like this:

```
(function(){
	window.innerWidth > 1000 
    ? queryMaker.load("0.json","0.css") 
    : queryMaker.load("light.json","light.css");
})()
```

Before, during and after rendering elements, a function can be registered on them:

```
queryMaker
  .register("main",function(){
	d3.select("#gwent_r2").classed("bigBoy",false);
	this.fetch(".queryMakerCarrier").forEach(function(d,i,a){
	    queryMaker.render(
                generateJSON(
                    d.id,"row_"+i,Math.min(36,__cardCount),
                    i === a.length - 1 
                        ? true
                        : false
                )
            );
	    __cardCount -= 36;  
	  })
  })
```
The registered function can be called like this:

```
queryMaker.queries["main"].perform();
```

There are several events that can be triggered and attached, these are:

- onLoad
- onKilled
- onFadein
- onFadeout
- sync
- rSync
- onPerform
- onFisheye

In return there are also several actions that a loaded query (and its rendered children) can make:

- fetch
- fadeout
- fadein
- fadeaway
- perform
- flush

I will be updating how to use these as the project develops further.

## Dependcies

D3 for DOM manipulation.