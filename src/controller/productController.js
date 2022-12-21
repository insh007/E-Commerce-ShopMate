const productModel=require("../models/productModel")
const {isValidObjectId} = require("mongoose")
const { uploadFile } = require("./aws");
const {isValidString, isValidSize, isValidPrice,isValidImg,isValidTitle,isValidStyle,valid } = require("../validator/validation");

const createProduct = async function(req,res){
    try{
      let data = req.body
      let files = req.files 
      let {title,description,price,currencyId,currencyFormat,productImage,availableSizes} = data
    
      /*------------------------- Checking fields are present or not -----------------------------------*/
      if(!title)return res.status(400).send({status:false, message:"title is required"})
      if(!description)return res.status(400).send({status:false, message:"description is required"})
      if(!price)return res.status(400).send({status:false, message:"price is required"})
      if(!currencyId)return res.status(400).send({status:false, message:"currencyId is required"})
      if(!currencyFormat)return res.status(400).send({status:false, message:"currencyFormat is required"})
      if(!productImage)return res.status(400).send({status:false, message:"productImage is required"})
  
      /*------------------------- Checking fields values are empty or not -----------------------------------*/
      if(!(isValidString(title)))return res.status(400).send({status:false, message:"title is empty"})
      if(!(isValidString(description)))return res.status(400).send({status:false, message:"description is empty"})
      if(!(isValidString(currencyId)))return res.status(400).send({status:false, message:"currencyId is empty"})
      if(!(isValidString(currencyFormat)))return res.status(400).send({status:false, message:"currencyFormat is empty"})
      
      if(!(isValidPrice(price)))return res.status(400).send({status:false, message:"Invalid price value"})
      if(!(isValidSize(availableSizes)))return res.status(400).send({status:false, message:"please provide valid size ex: S, XS,M,X, L,XXL, XL"}) 
      if(currencyId!='INR')return res.status(400).send({status:false, message:"Invalid cuurencyId"})
      if(currencyFormat!='₹')return res.status(400).send({status:false, message:"Invalid cuurencyFormat"})
  
      /*------------------------- Checking title is unique or not -----------------------------------*/
      let duplicateTitle = await productModel.findOne({title:title})
      if(duplicateTitle)return res.status(400).send({status:false, message:"title is already registered"})
  
      if (files && files.length > 0) {
        let uploadedFileURL = await uploadFile(files[0]);
        data.productImage = uploadedFileURL
      } 
  
      const createData = await productModel.create(data) 
      return res.status(201).send({status:true, message:"Success", data:createData})
    }
    catch(err){
      return res.status(500).send({ status: false, message: err.message })
    }
  }
  

const getProductsByFilter=async function(req,res){
    try{
     let {size,name,priceGreaterThan,priceLessThan,priceSort }=req.query
     let data = {isDeleted:false}
     if(size){
      size=size.toUpperCase()
         data['availableSizes']= {$in: size}
     } 
     if(name){
         
         data['title']= name
     }
     if(priceGreaterThan){
         data['price']= {$gt:priceGreaterThan}
     }
     if(priceLessThan){
         data['price']= {$lt:priceLessThan}
     }
     if(priceSort){
         if(!(priceSort==1 || priceSort==-1)){
             return res.status(400).send({status:false,message:"price sort can have only two values 1 or -1"})
         }
     }
     let filteredData=await productModel.find(data).sort({price:priceSort})

     
     if(filteredData.length==0){return res.status(404).send({status:false,message:"data is not present"})}
     res.send(filteredData)
}
    catch(err){
       res.status(500).send({status:false,msg:err.message})
    }
 }


const getProductByID = async function (req, res) {
    try {
      const productId = req.params.productId;
      if (!isValidObjectId(productId))
        return res.status(400).send({ status: false, message: "Invalid Product Id" });
  
      const checkProduct = await productModel.findOne({ _id: productId, isDeleted: false, });
  
      if (!checkProduct)
        return res.status(400).send({ status: false, message: "Product does not exist" });
  
      return res.status(200).send({ status: true, message: "Success", data: checkProduct});
  
    } catch (err) {
      return res.status(500).send({ status: false, message: err.message });
    }
  };

  const updateProduct = async function (req, res) {
    try {
        let productId = req.params.productId
        if (!isValidObjectId(productId)) return res.status(400).send({ status: false, msg: `${productId} is not valid productId` })

        let updateData = req.body
        let files = req.files
        console.log(files)
        if (!(valid(updateData) || files)) return res.status(400).send({ status: false, msg: "please input some data to update" })
        if(files.length>0){
        if (!isValidImg(files[0].originalname)) { return res.status(400).send({ status: false, message: "Image Should be of JPEG/ JPG/ PNG" }); }
        }
        let findProductData = await productModel.findById({ _id: productId })
        if (!findProductData) return res.status(404).send({ status: false, msg: `no data found by this ${productId} productId` })
        if (findProductData.isDeleted == true) return res.status(400).send({ status: false, msg: "this product is deleted so you can't update it" })

        let { title, description, price, currencyId, currencyFormat, isFreeShipping, style, availableSizes, installments, productImage, deletedAt, isDeleted } = updateData

        for(let key in req.body){
            if(req.body[key].trim().length==0){
                return res.status(400).send({status:false, message:`${key} can't be empty`})
            }
        }


        if (title) {
            if (!isValidTitle(title.trim())) return res.status(400).send({ status: false, message: "Enter a proper title" })
            if (findProductData.title == title) return res.status(400).send({ status: false, msg: "title should be unique" })
        }

        if (description) {
            if (!description) return res.status(400).send({ status: false, msg: "enter valid description" })
        }

        if (price) {
            if (!isValidPrice(price.trim())) return res.status(400).send({ status: false, message: "Enter a proper price" })
        }

        if (currencyId) {
            if (currencyId !== "INR") return res.status(400).send({ status: false, msg: "enter valid currencyId in that formate INR" })
        }

        if (currencyFormat) {
            if (!valid(currencyFormat)) return res.status(400).send({ status: false, message: "Please enter currencyFormat in correct format" })
            if (currencyFormat != '₹') return res.status(400).send({ status: false, message: "Please enter a valid currencyFormat in ₹ " })
        }

        if (isFreeShipping) {
            if (!(isFreeShipping == "true" || isFreeShipping == "false"))
                return res.status(400).send({ status: false, message: "Please enter a boolean value for isFreeShipping" })
        }
         
        
         let uploadedFileURL = await uploadFile(files[0]);
          updateData.productImage= uploadedFileURL
       

        if (style) {
            if (!isValidStyle(style)) return res.status(400).send({ status: false, msg: "enter valid style" })
        }

        if (availableSizes) {
            if (!isValidSize(availableSizes.trim())) return res.status(400).send({ status: false, msg: "enter valid availableSizes from 'S', 'XS', 'M', 'X', 'L', 'XXL', 'XL'" })
        }

        if (installments) {
            if (!(/^[0-9]+$/.test(installments.trim()))) return res.status(400).send({ status: false, message: "Invalid value for installments" })
        }

        if (isDeleted) {
            if (!(isDeleted == "true" || isDeleted == "false"))
                return res.status(400).send({ status: false, message: "Please enter a boolean value for isDeleted" })
        }

        let updatedProductData = await productModel.findOneAndUpdate({ _id: productId, isDeleted: false }, { $set: { ...updateData } }, { new: true })

        return res.status(200).send({ status: true, message: "Success", data: updatedProductData })
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}

  const deleteProduct = async function (req, res) {  
    try {
        let productId = req.params.productId
        if (!isValidObjectId(productId)) return res.status(400).send({ status: false, msg: `${productId} is not valid productId` })
        let ProductData = await productModel.findOne({ _id: productId })
        if (!ProductData) return res.status(404).send({ status: false, msg: `no data found by this ${productId} productId` })
        if (ProductData.isDeleted == true) return res.status(400).send({ status: false, msg: "this product is already deleted" })
        let deletedProduct = await productModel.findOneAndUpdate({ _id: productId, isDeleted: false }, { $set: { isDeleted: true } }, { new: true });

        return res.status(200).send({ status: true, message: "Success", data: deletedProduct })

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}



 module.exports= {getProductsByFilter, createProduct, getProductByID,updateProduct,deleteProduct}