// content.js
console.log("Recipe Calorie Counter content script loaded");

function extractRecipeContent() {
  console.log("Attempting to extract recipe content");

  // Try structured data first
  const jsonLd = document.querySelector('script[type="application/ld+json"]');
  if (jsonLd) {
    try {
      const data = JSON.parse(jsonLd.textContent);
      if (data['@type'] === 'Recipe') {
        console.log("Structured recipe data found");
        return {
          name: data.name,
          ingredients: Array.isArray(data.recipeIngredient) ? data.recipeIngredient.join('\n') : data.recipeIngredient,
          instructions: Array.isArray(data.recipeInstructions) 
            ? data.recipeInstructions.map(step => typeof step === 'object' ? step.text : step).join('\n')
            : data.recipeInstructions
        };
      }
    } catch (e) {
      console.error('Error parsing JSON-LD:', e);
    }
  }

  // Try common HTML structures
  const nameElement = document.querySelector('h1.recipe-title, .recipe-name, [itemprop="name"]');
  const ingredientsElements = document.querySelectorAll('.ingredients li, [itemprop="recipeIngredient"]');
  const instructionsElements = document.querySelectorAll('.instructions li, [itemprop="recipeInstructions"]');

  if (nameElement && ingredientsElements.length && instructionsElements.length) {
    console.log("Recipe elements found in HTML");
    return {
      name: nameElement.textContent.trim(),
      ingredients: Array.from(ingredientsElements).map(el => el.textContent.trim()).join('\n'),
      instructions: Array.from(instructionsElements).map(el => el.textContent.trim()).join('\n')
    };
  }

  // If no structured data or common elements found, try a more general approach
  const bodyText = document.body.innerText;
  const possibleIngredients = bodyText.match(/(?:ingredients?:?)[\s\S]*?(?=instructions|directions|method|steps|preparation)/i);
  const possibleInstructions = bodyText.match(/(?:instructions|directions|method|steps|preparation:?)[\s\S]*/i);

  if (possibleIngredients && possibleInstructions) {
    console.log("Possible recipe content found in body text");
    return {
      name: document.title,
      ingredients: possibleIngredients[0],
      instructions: possibleInstructions[0]
    };
  }

  console.log("No recipe content found");
  return null;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in content script:", request);
  if (request.action === "extractContent") {
    const recipeContent = extractRecipeContent();
    console.log("Extracted content:", recipeContent);
    sendResponse(recipeContent);
  }
});