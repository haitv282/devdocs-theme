window.onload = function() {
  searchApp({
    appId: algolia.id,
    apiKey: algolia.key,
    indexName: algolia.index
  });

  function searchApp(opts) {
    var defaults = {
      hitsPerPage: 10,
      refinementListLimit: 40,
      hiddenClassName: "hide",
      resultsClassName: "search-results",
      hitsClassName: "search-results-main",
      statsClassName: "search-results-stats",
      paginationClassName: "search-results-pagination",
      refinementsClassName: "search-results-refinements",
      navContainerId: "index-navigation",
      navListClassName: "tabs",
      navItemClassName: "tab-item",
      navItemClassNameSelected: "is-selected"
    };

    var navItems = [];
    var searchClient = algoliasearch(opts.appId, opts.apiKey);
    var mainIndex;
    var searchIndices = [];
    var subIndices = [];

    // Inisialize all the search indices
    function init() {
      // Sub indices
      for (var i = 1; i < indices.length; i++) {
        var subIndex = initSearchIndex(indices[i], searchClient);
        subIndices.push(subIndex);
      }

      // Main index. Passing the searchFunction with the list of subIndices to sync the searches
      mainIndex = initSearchIndex(indices[0], searchClient, function(helper) {
        for (var i = 0; i < subIndices.length; i++) {
          subIndices[i].helper.setQuery(helper.state.query).search();
        }
        helper.search();
      });

      searchIndices = [mainIndex].concat(subIndices);
    }

    // Create the navigation between indices
    var buildNav = function() {
      // Nav container
      var navList = document.createElement("div");
      navList.className = defaults.navListClassName;

      // Build each item
      navItems = indices.map(function(item, index) {
        var className = [
          defaults.navItemClassName,
          !index ? defaults.navItemClassNameSelected : null // first item is selected
        ].join(" ");

        var navItem = document.createElement("div");

        navItem.className = className;
        navItem.tabIndex = 0;
        navItem.innerHTML =
          '<label class="tab-item-label">' + item.label + "</label>";
        navItem.onclick = function(event) {
          handleIndexClick(event, item.name);
        };
        navList.appendChild(navItem);

        return navItem;
      });

      // Output the HTML
      document.getElementById(defaults.navContainerId).appendChild(navList);
    };

    var handleIndexClick = function(event, indexName) {
      // Get all the tab content items and hide them
      var tabcontent = document.getElementsByClassName(
        defaults.resultsClassName
      );

      for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
      }

      // Remove the active class
      for (i = 0; i < navItems.length; i++) {
        navItems[i].className = navItems[i].className.replace(
          " " + defaults.navItemClassNameSelected,
          ""
        );
      }

      // Show the current tab, and add an "active" class to the button that opened the tab
      document.getElementById(indexName).style.display = "grid";
      event.currentTarget.className += " " + defaults.navItemClassNameSelected;
    };

    var initSearchIndex = function(indexConfig, searchClient, searchFunction) {
      var searchIndex = instantsearch({
        indexName: indexConfig.name,
        searchClient: searchClient,
        searchFunction: searchFunction,
        searchParameters: {
          hitsPerPage: defaults.hitsPerPage,
          facetFilters: indexConfig.facets
        },
        routing: true
      });

      searchIndex.baseUrl = indexConfig.baseUrl;
      searchIndex.refinements = indexConfig.refinements;
      return searchIndex;
    };

    // Add the search widgets UI for given index
    var addSearchWidgets = function(searchIndex) {
      // Hits
      searchIndex.addWidget(
        instantsearch.widgets.hits({
          container: searchIndex.hitsContainer,
          hitsPerPage: defaults.hitsPerPage,
          escapeHTML: true,
          templates: {
            item: function(item) {
              var title_highlighted = item._highlightResult.title;
              var title_plain = item.title;
              var title = "";
              var baseUrl = searchIndex.baseUrl;
              var url = item.url;
              var content = "";
              // Check if we can show title, if not - at least show URL
              if (typeof title_highlighted !== "undefined") {
                title = title_highlighted.value;
              } else if (typeof title_plain !== "undefined") {
                title = title_plain;
              } else {
                title = url;
              }

              // Check if we have the description of the hit
              if (typeof item._highlightResult.content !== "undefined") {
                content = item._highlightResult.content.value;
              }

              var link = '<a href="' + baseUrl + url + '">' + title + "</a>";

              return (
                '<div class="hit"><h2 class="hit-name">' +
                link +
                '</h2><div class="hit-url">' +
                baseUrl +
                url +
                '</div><div class="hit-content">' +
                content +
                "</div></div>"
              );
            },
            empty: '<div id="no-results-message"><p>No results found.</p></div>'
          }
        })
      );

      // Stats
      searchIndex.addWidget(
        instantsearch.widgets.stats({
          container: searchIndex.statsContainer
        })
      );

      // Pagination
      searchIndex.addWidget(
        instantsearch.widgets.pagination({
          container: searchIndex.paginationContainer,
          scrollTo: "#search-input"
        })
      );

      // Refinements
      if (searchIndex.refinements && searchIndex.refinements instanceof Array) {
        for (var i = 0; i < searchIndex.refinements.length; i++) {
          var refinement = searchIndex.refinements[i];
          var container = document.createElement("div");
          searchIndex.refinementsContainer.appendChild(container);

          var refinementListWithPanel = instantsearch.widgets.panel({
            templates: {
              header: refinement.label
            }
          })(instantsearch.widgets.refinementList);

          searchIndex.addWidget(
            refinementListWithPanel({
              container: container,
              attribute: refinement.attribute,
              limit: defaults.refinementListLimit,
              showMoreLimit: defaults.refinementListLimit + 50,
              sortBy: ['name:asc'],
              operator: 'or',
              showMore: true
            })
          );
        }
      }
    };

    var render = function() {
      buildNav();

      // Create containers for each index
      for (var i = 0; i < searchIndices.length; i++) {
        var container = document.createElement("div");
        container.classList.add(defaults.resultsClassName);

        container.id = searchIndices[i].indexName;

        var statsContainer = document.createElement("div");
        var hitsContainer = document.createElement("div");
        var refinementsContainer = document.createElement("div");
        var paginationContainer = document.createElement("div");
        hitsContainer.classList.add(defaults.hitsClassName);
        statsContainer.classList.add(defaults.statsClassName);
        paginationContainer.classList.add(defaults.paginationClassName);
        refinementsContainer.classList.add(defaults.refinementsClassName);

        container.appendChild(statsContainer);
        container.appendChild(hitsContainer);
        container.appendChild(refinementsContainer);
        container.appendChild(paginationContainer);

        searchIndices[i].hitsContainer = hitsContainer;
        searchIndices[i].statsContainer = statsContainer;
        searchIndices[i].paginationContainer = paginationContainer;
        searchIndices[i].refinementsContainer = refinementsContainer;

        document.getElementById("hits").appendChild(container);
      }

      // Search Box
      mainIndex.addWidget(
        instantsearch.widgets.searchBox({
          container: "#search-input",
          placeholder: "Search",
          showSubmit: false,
          showLoadingIndicator: false
        })
      );

      addSearchWidgets(mainIndex);

      // Sub indexes
      for (var i = 1; i < searchIndices.length; i++) {
        var search = searchIndices[i];
        addSearchWidgets(search);
        search.start();
      }

      mainIndex.start();
    };

    init();
    render();
  }
};
