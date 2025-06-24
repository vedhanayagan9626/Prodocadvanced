#pragma once

#include "paddle/phi/core/meta_tensor.h"
#include "paddle/phi/common/scalar.h"
#include "paddle/phi/common/int_array.h"

namespace phi {

void AllcloseInferMeta(const MetaTensor& x, const MetaTensor& y, const Scalar& rtol, const Scalar& atol, bool equal_nan, MetaTensor* out);

void CeluInferMeta(const MetaTensor& x, float alpha, MetaTensor* out);

void ClipInferMeta(const MetaTensor& x, const Scalar& min, const Scalar& max, MetaTensor* out);

void EluInferMeta(const MetaTensor& x, float alpha, MetaTensor* out);

void GeluInferMeta(const MetaTensor& x, bool approximate, MetaTensor* out);

void Grid_sampleInferMeta(const MetaTensor& x, const MetaTensor& grid, const std::string& mode, const std::string& padding_mode, bool align_corners, MetaTensor* out);

void Hard_shrinkInferMeta(const MetaTensor& x, float threshold, MetaTensor* out);

void Hard_sigmoidInferMeta(const MetaTensor& x, float slope, float offset, MetaTensor* out);

void HardtanhInferMeta(const MetaTensor& x, float t_min, float t_max, MetaTensor* out);

void IscloseInferMeta(const MetaTensor& x, const MetaTensor& y, const Scalar& rtol, const Scalar& atol, bool equal_nan, MetaTensor* out);

void Label_smoothInferMeta(const MetaTensor& label, const MetaTensor& prior_dist, float epsilon, MetaTensor* out);

void Leaky_reluInferMeta(const MetaTensor& x, float negative_slope, MetaTensor* out);

void LogitInferMeta(const MetaTensor& x, float eps, MetaTensor* out);

void Npu_identityInferMeta(const MetaTensor& x, int format, MetaTensor* out);

void PolygammaInferMeta(const MetaTensor& x, int n, MetaTensor* out);

void PowInferMeta(const MetaTensor& x, const Scalar& y, MetaTensor* out);

void Put_along_axisInferMeta(const MetaTensor& arr, const MetaTensor& indices, const MetaTensor& values, int axis, const std::string& reduce, MetaTensor* out);

void RenormInferMeta(const MetaTensor& x, float p, int axis, float max_norm, MetaTensor* out);

void ScaleInferMeta(const MetaTensor& x, const Scalar& scale, float bias, bool bias_after_scale, MetaTensor* out);

void SeluInferMeta(const MetaTensor& x, float scale, float alpha, MetaTensor* out);

void SoftplusInferMeta(const MetaTensor& x, float beta, float threshold, MetaTensor* out);

void SoftshrinkInferMeta(const MetaTensor& x, float threshold, MetaTensor* out);

void StanhInferMeta(const MetaTensor& x, float scale_a, float scale_b, MetaTensor* out);

void Thresholded_reluInferMeta(const MetaTensor& x, float threshold, MetaTensor* out);

void Update_loss_scalingInferMeta(const std::vector<const MetaTensor*>& x, const MetaTensor& found_infinite, const MetaTensor& prev_loss_scaling, const MetaTensor& in_good_steps, const MetaTensor& in_bad_steps, int incr_every_n_steps, int decr_every_n_nan_or_inf, float incr_ratio, float decr_ratio, const Scalar& stop_update, std::vector<MetaTensor*> out, MetaTensor* loss_scaling, MetaTensor* out_good_steps, MetaTensor* out_bad_steps);

void Assign_valueInferMeta(const std::vector<int>& shape, DataType dtype, const std::vector<phi::Scalar>& values, MetaTensor* out);

void ExponentialInferMeta(const MetaTensor& x, float lam, MetaTensor* out);

void FillInferMeta(const MetaTensor& x, const Scalar& value, MetaTensor* out);

void FullInferMeta(const IntArray& shape, const Scalar& value, DataType dtype, MetaTensor* out);

void Full_likeInferMeta(const MetaTensor& x, const Scalar& value, DataType dtype, MetaTensor* out);

void Matrix_rankInferMeta(const MetaTensor& x, float tol, bool use_default_tol, bool hermitian, MetaTensor* out);

void MishInferMeta(const MetaTensor& x, float lambda, MetaTensor* out);

void UniformInferMeta(const IntArray& shape, DataType dtype, const Scalar& min, const Scalar& max, int seed, MetaTensor* out);

}  // namespace phi
