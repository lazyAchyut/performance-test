;(function(window, document, undefined) {
'use strict';


function Main(){
	var $routeObj = null;
	var $dataObj = null;
	var $repeatObj = null;
	var $dependency = null;

	this.$isRouteDefined = false;
	this.$scope = {};
	this.$rootElement = [];
	this.$routeParam = [];
	this.$rootElement;
	var that = this;


	this.$checkUserRoute = function($functionName){ 
		if(typeof eval($functionName) === "function")	//invoke only if routing is defined by user in myapp.js
			that.$isRouteDefined = true;
	}

	this.$initializeRoute = function(){
		$routeObj = new LfRoute();
		$routeObj.$doRoute();
		// $routeObj.$addListener();
	}

	this.$initializeDataBind = function(){
		$dataObj = new LfBind();
		$dataObj.$registerWatcher();
		$dataObj.$observeObject();
		$dataObj.$addListener();
		$dataObj.$initializeFirstView();
	}	

	this.$initializeRepeat = function(){
		$repeatObj = new LfRepeat();
		$repeatObj.$initRepeat();
		$repeatObj.$doRepeat();
		$repeatObj.$doDetail();
	}

	this.$initializeDependency = function(){
		$dependency = new DependencyInjection();

	}

	this.$bootstrap = function(){
		that.$rootElement = document.querySelector('[lf-app]');
		
		if(that.$rootElement === null) 
			return;

		that.$checkUserRoute('RouteProvider'); 

		$dependency = new DependencyInjection();

		if(that.$isRouteDefined){
			$routeObj = new LfRoute();
			$dependency.$registerDependency('$route' , $routeObj);
			$dependency.$process(RouteProvider);
			$routeObj.$doRoute();
		}

		setTimeout($dependency.$invokeController,10);
		setTimeout(that.$initializeRepeat,100);
		that.$initializeDataBind();

		window.addEventListener("hashchange", that.$updateSerivces, false); 

	}

	this.$updateSerivces = function(){ 
		if($routeObj){
			$routeObj.$doRoute();
		
			that.$scope = {};

			$dependency.$invokeController();

			$repeatObj.$initRepeat();

			setTimeout($repeatObj.$doRepeat,100);

			$repeatObj.$doDetail();

			$dataObj.$registerWatcher();
			$dataObj.$addListener();
			$dataObj.$initializeFirstView();
		}
	}

} //end of Main Class


///////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////

var $main = new Main();
$main.$bootstrap();

///////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////

function DependencyInjection(){
    var $dependencies = {};
    var that = this;

    this.$process = function(target){ 
        var FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
        var FN_ARG_SPLIT = /,/;
        var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/;
        var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        var text = target.toString();
        var args = text.match(FN_ARGS)[1].split(','); 

        target.apply(target, that.$getDependencies(args));
    }

    this.$getDependencies = function(arr){ 
        return arr.map(function(value) {
            return $dependencies[value];
        });  
    }

    this.$registerDependency = function(name , dependency){
        $dependencies[name] = dependency;
    }

    this.$getControllers = function(){ 
    	return $main.$rootElement.querySelectorAll('[lf-controller]');
    }

    this.$invokeController = function(){ 
    	var $controllers = that.$getControllers(); 
    	for(var i=0;i<$controllers.length;i++){ 
    		var $controllerName = $controllers[i].getAttribute('lf-controller').trim();
    		$main.$scope[$controllerName] = {};
    		that.$registerDependency('$scope',  $main.$scope[$controllerName]);
    		that.$process(eval($controllerName));
    	}
    }
}





///////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////

//data binding section
function LfBind(){
	var $watchModels = [];  //models to watch for
	var $watchBinds = [];   //binds to watch for
	var that = this;

	this.$registerWatcher = function(){ 	
		$watchModels = $main.$rootElement.querySelectorAll('[lf-model]'); 
		$watchBinds = $main.$rootElement.querySelectorAll('[lf-bind]');
	}

	this.$observeObject = function(){
		//observe changes in $scope object, if any change is detected it updates respective models and bind
		Object.observe($main.$scope, function(changes){
		    changes.forEach(function(change) {
		    	// console.log(change.type, ' : ',change.name,' : ', change.oldValue);
		    	that.$updateView(change.name);
		   	 }); //end of change.foreach
		}); //end of object.observe
	}

	this.$addListener = function(){ 
		for(var i = 0, len = $watchModels.length; i < len; i++){
			$watchModels[i].count = i;
			$watchModels[i].addEventListener('keyup', function(evt)
			{ 
				var index = evt.target.count;
				var key = $watchModels[index].getAttribute('lf-model');
				var value = $watchModels[index].value;
				$main.$scope[key] = value;
			});
		}
	}
	
	//updates the model and binds with data if initially present in scope object
	this.$initializeFirstView = function(){ 	
		for(var i = 0, len = $watchModels.length; i < len; i++){
			var $tag = $watchModels[i].getAttribute('lf-model'); 	
			if($main.$scope.hasOwnProperty($tag))
				$watchModels[i].value = $main.$scope[$tag];
				$watchModels[i].innerHTML = $main.$scope[$tag];
		}

		for(var i = 0, len = $watchBinds.length; i < len; i++){
			var $tag = $watchBinds[i].getAttribute('lf-bind'); 	
			if($main.$scope.hasOwnProperty($tag))
				$watchBinds[i].value = $main.$scope[$tag];
				$watchBinds[i].innerHTML = $main.$scope[$tag];
		}
	}	

	//search and update all bind and models of changed variable
	this.$updateView = function($tag){
	   	for(var j = 0, len = $watchModels.length; j < len; j++){
			if($tag === $watchModels[j].getAttribute('lf-model')){
				$watchModels[j].value = $main.$scope[$tag];
				$watchModels[j].innerHTML = $main.$scope[$tag];
			}
    	} 

    	for(var j = 0, len = $watchBinds.length; j < len; j++){
			if($tag === $watchBinds[j].getAttribute('lf-bind')){
				$watchBinds[j].value = $main.$scope[$tag];
				$watchBinds[j].innerHTML = $main.$scope[$tag];
			}
    	}   	
	}
} //end of LfBind


//routing section
function LfRoute(){
		// const $USER_DEFINED_ROUTES = $routeProvider(); //$routeProvider() returns user defined routes, lies in user's controller
		this.$USER_DEFINED_ROUTES = {}; //$routeProvider() returns user defined routes, lies in user's controller
		var $allLinks;
		var $xhr; //XMLHttpRequest object
		var that = this;


		//get all link and when click event is detected call $doRoute method	
	  //   this.$addListener = function(){ 
	  // //   	//after rendering first view, lf-repeate might rendor some dynamic links later so, it needs to be rechecked again and again	
	  // //   	$allLinks = $main.$rootElement.querySelectorAll('a'); 
			// // for(var i = 0, len = $allLinks.length; i < len; i++){
			// // 	$allLinks[i].addEventListener('click',function(evt){ 
			// // 		setTimeout(that.$doRoute, 0);
			// // 		setTimeout($main.$updateSerivces,10);
			// // 	});
			// // }
	  //   }

		this.$doRoute = function(){ 
			var $matchedRoute = []; //holds route and templateUrl of matched route
	    	var $urlAfterHash = '';
			var $currentUrl;
			var $parsedUrl = [];
			var	$currentDir;
			var $container = document.querySelector('[lf-view]');

			$currentUrl = document.URL
			$parsedUrl = that.$parseStr($currentUrl,'#');
			$currentDir = $parsedUrl[0].substr(0,$parsedUrl[0].lastIndexOf('/')); //current directory	

			if(($parsedUrl[1] != null && $parsedUrl[1] != '')){ 
				$urlAfterHash = $parsedUrl[1];
				$matchedRoute = that.$mapUrlAfterHash($urlAfterHash);
				
				if($matchedRoute != null){
					var $path =  $currentDir + $matchedRoute.templateUrl.trim();
					that.$loadView($container, $path);
				}
				else{ 
					var $redirectPath = that.$getOtherwisePath(that.$USER_DEFINED_ROUTES);
					if($redirectPath != null ){
						window.location.href = $parsedUrl[0] + '#' + $redirectPath;  //logout
						$matchedRoute = that.$mapUrlAfterHash($redirectPath); 
						var $path =  $currentDir + $matchedRoute.templateUrl.trim();
						that.$loadView($container, $path);
					}		
				}	
			}
		}

		this.$parseStr = function(str,delimiter){ 
			return str.split(delimiter);
		}

		//returns matched route's path and templateUrl
		this.$mapUrlAfterHash = function($path){
			var $tempParsedPath = [];
			$tempParsedPath = that.$parseStr($path , '/');  
			$tempParsedPath = $tempParsedPath.filter(Boolean); 
			for(var i = 0; i<that.$USER_DEFINED_ROUTES.length-1;i++){  //dont check otherwise part in $USER_DEFINED_ROUTES
				var $tempJson = that.$parseStr(that.$USER_DEFINED_ROUTES[i].when , '/');  
				$tempJson = $tempJson.filter(Boolean); 
				var flag = true;
				if($tempParsedPath.length == $tempJson.length)
				{
					for(var j=0; j<$tempParsedPath.length;j++)
					{
						if($tempParsedPath[j] === $tempJson[j])
							continue;
						else if($tempJson[j].substr(0,1)===':'){
							console.log("Assign " + $tempParsedPath[j] + " to " +  $tempJson[j].substr(1) );
							$main.$routeParam[$tempJson[j].substr(1)] = $tempParsedPath[j];
						}
						else{
							flag = false;
							break;
						}
					}
					if(flag === true)
						return that.$USER_DEFINED_ROUTES[i];
				}
			}
		}

		//returns redirectTO url of otherwise property in user defined route
		this.$getOtherwisePath = function(){
			for(var i in that.$USER_DEFINED_ROUTES){ 
				if(that.$USER_DEFINED_ROUTES[i].otherwise == '')
					return that.$USER_DEFINED_ROUTES[i].redirectTo;
			}
		}

		
		this.$loadView = function($container,$path){ 
			$xhr = that.$getXhr();
		    $xhr.onreadystatechange = function () {
		        if ($xhr.readyState === 4 && $xhr.status == 200) {  
		           $container.innerHTML = $xhr.responseText;
		        }
		   	}
		   $xhr.open('GET', $path, false);
		   $xhr.send(null);
		}

		this.$getXhr = function(){
			if(!$xhr){ 
				if (window.XMLHttpRequest) 
		        	$xhr = new XMLHttpRequest(); 
			    else if (window.ActiveXObject) 
			        $xhr = new ActiveXObject("Msxml2.XMLHTTP");
			    else 
			        throw new Error("Ajax is not supported by your browser");
			}
			return $xhr;
		}
	} //end of class LFRoute


//lf-repeate
function LfRepeat(){
	var $allRepeats;
	var $allDetails;
	var $collectionName; //scope property
	var $controllerName;
	var $tempScope;
	var that = this;

	this.$initRepeat = function(){
		$allRepeats = $main.$rootElement.querySelectorAll('[lf-repeat]');
		$allDetails = $main.$rootElement.querySelectorAll('[lf-detail]');
	}

	this.$doRepeat = function(){
		var $currentRepeat; 
		var $innerBinds;
		var $bindAttr;
		for(var i = 0; i<$allRepeats.length;i++){
			$currentRepeat = $allRepeats[i];
			$collectionName = ($currentRepeat.getAttribute('lf-repeat')).trim();
			$controllerName = ($currentRepeat.getAttribute('lf-controller')).trim();
			
			//get scope and append controller name here
			$tempScope = $main.$scope[$controllerName];

			if($tempScope.hasOwnProperty($collectionName)){
				$innerBinds = $currentRepeat.querySelectorAll('[lf-bind]');
				that.$removeElements($currentRepeat,$innerBinds);
				for(var j=0;j<$tempScope[$collectionName].length;j++){
					for(var noOfBinds=0;noOfBinds<$innerBinds.length;noOfBinds++){
						$bindAttr = ($innerBinds[noOfBinds].getAttribute('lf-bind')).trim();
						if($tempScope[$collectionName][j].hasOwnProperty($bindAttr))
							that.$renderRepeat($currentRepeat , $innerBinds[noOfBinds] , j , $bindAttr);
					}
				}
			}
		}
	}

	this.$doDetail = function(){
		var $currentDetail;
		var $innerBinds;
		var $attributes;
		var $bindAttr;
		var $index;
		var $key;
		for(var i=0;i<$allDetails.length;i++){
			$currentDetail = $allDetails[i];
			$attributes = ($currentDetail.getAttribute('lf-detail')).split('of');
			$collectionName = $attributes[0].trim();
			$controllerName = ($currentDetail.getAttribute('lf-controller')).trim();
			$tempScope = $main.$scope[$controllerName];

			$key = $attributes[1].trim();
			$index = $main.$routeParam[$key];

			if($tempScope.hasOwnProperty($collectionName)){
				for(var i=0;i<$tempScope[$collectionName].length;i++){
					if($tempScope[$collectionName][i].roll == $index){
						$innerBinds = $currentDetail.querySelectorAll('[lf-bind]');
						that.$removeElements($currentDetail,$innerBinds);

						for(var noOfBinds=0;noOfBinds<$innerBinds.length;noOfBinds++){
							$bindAttr = ($innerBinds[noOfBinds].getAttribute('lf-bind')).trim();
							if($tempScope[$collectionName][i].hasOwnProperty($bindAttr)){
								that.$renderRepeat($currentDetail , $innerBinds[noOfBinds] , i , $bindAttr);
							}
						}
					}
				}
			
			}

		}
	}


	this.$removeElements = function(parent,child){
		for(var i=0;i<child.length;i++)
			parent.removeChild(child[i]);
	}

	this.$renderRepeat = function(parentNode,childNode,index,key){
		childNode = childNode.cloneNode();
		childNode.removeAttribute('lf-bind');
		childNode.innerHTML = $tempScope[$collectionName][index][key];
		parentNode.appendChild(childNode);
		parentNode.innerHTML = parentNode.innerHTML.replace('{{'+key+'}}',$tempScope[$collectionName][index][key]);
	}
	
} //end of class LfRepeat




	//to make sure that all files are loaded properly
	// var tid = setInterval( function () {
	//     if ( document.readyState !== 'complete' ) return;
	//     clearInterval( tid );         
	// 	if(typeof $routeProvider === "function"){
	// 		$routeObj = new LfRoute(document) //invoke it only if it is defined by user
	// 		$routeObj.$doRoute();
	// 	}
	// 	else
	// 	console.log("$routeProvider is not defined, Do nothing.");

	// 	$bootstrap();
	// 	$repeatService();
	// }, 100 );	


})(window, document);