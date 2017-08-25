// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Get the current URL.
 *
 * @param {function(string)} callback - called when the URL of the current tab
 *   is found.
 */
 chrome.tabs.executeScript(null, { file: "jquery-3.2.1.min.js" }, function() {
 debugger;
   $(function(){});
  function getCurrentTabUrl(callback) {
    // Query filter to be passed to chrome.tabs.query - see
    // https://developer.chrome.com/extensions/tabs#method-query
    var queryInfo = {
      active: true,
      currentWindow: true
    };

    chrome.tabs.query(queryInfo, function(tabs) {
      var tab = tabs[0];
      var url = tab.url;

      console.assert(typeof url == 'string', 'tab.url should be a string');

      callback(url);
    });
  }

  chrome.runtime.onMessage.addListener(function(request, sender) {
    if (request.action == "getSource") {
      var basketItem = /basket_product_([0-9]+)/g;
      console.log(request.source.match(basketItem));
    }
  });


  var $lis = $(".sideBasketContents").find("li");
  var prods = {};

  for(var i = 0; i < $lis.length; i++)
    (function($li){
      prods[$($li).prop("id").split("-")[1]] = {
        $li: $($li)
      };
    })($lis[i]);

  $.get({
    url: "https://dev.tescolabs.com/product/?tpnc=" + Object.keys(prods).join("&tpnc="),
    headers: {"Ocp-Apim-Subscription-Key": "b30688fcf2524ba98bf8bdf982a8c882"}
  }, function(prodDetails){
    for(var prodDetailKey in prodDetails.products){
      var prodDetail = prodDetails.products[prodDetailKey];
      var prod = prods[prodDetail.tpnc];

      prod.detail = prodDetail;
      prod.rating = handleProduct(prodDetail);

      for(var ratingKey in prod.rating){
        if(prod.rating[ratingKey])
          prod.$li.find(".productDetailsLink").after($("<div/>").text(ratingKey).addClass("rating certainty-" + prod.rating[ratingKey]));
      }

      console.log(prods);
    }
  });

  var handleProduct = function(prod){
    var product = {
      vegan: Certainty.Amber,
      vegetarian: Certainty.Amber
    };

    product.vegan = isVegan(prod);
    product.vegetarian = isVegetarian(prod);

    return product;
  };

  var nonVegetarianIngredients = ["chicken breast"];
  var nonVeganIngredients = nonVegetarianIngredients.concat(["cheese"]);

  var isVegetarian = function(prod){
    var lifestyleAttributes = prod.productAttributes[0].category[0].lifestyle;

    if(lifestyleAttributes){
      for(var i = 0; i < lifestyleAttributes.length; i++){
        if(lifestyleAttributes[i].lifestyle.value.toLowerCase() == "suitable for vegetarians")
          return Certainty.Green;
      }
    }

    return Certainty.Amber;
  }

  var isVegan = function(prod){
    var ingredients = prod.ingredients;

    if(ingredients){
      for(var i = 0; i < ingredients.length; i++){
        var certainty = certaintyOfMatch(ingredients[i], nonVeganIngredients);
        if(certainty){
            return certainty;
        }
      }
    }

    if(prod.description){
      var certainty = certaintyOfMatch(prod.description, nonVeganIngredients);
      if(certainty){
        return certainty;
      }
    }

    return Certainty.Amber;
  }

  var certaintyOfMatch = function(string, dangers){
    if(dangers.indexOf(string.toLowerCase()) > 0){
      return Certainty.Red;
    }
    if(dangers.filter(function(a) { return string.toLowerCase().includes(a); })){
      return Certainty.Amber;
    }
  }

  var Certainty = {
    Green: 1,
    Amber: 2,
    Red: 3
  };

  function onWindowLoad() {
    var message = document.querySelector('#message');

    chrome.tabs.executeScript(null, {
      file: "getPagesSource.js"
    }, function() {
      // If you try and inject into an extensions page or the webstore/NTP you'll get an error
      if (chrome.runtime.lastError) {
        message.innerText = 'There was an error injecting script : \n' + chrome.runtime.lastError.message;
      }
    });
  }

  window.onload = onWindowLoad;

  function renderStatus(statusText) {
    $('#message').text(statusText);
  }

  document.addEventListener('DOMContentLoaded', function() {
    getCurrentTabUrl(function(url) {


    }, function(errorMessage) {
      renderStatus('Cannot display image. ' + errorMessage);
    });
  });
});
